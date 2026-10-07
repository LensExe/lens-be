import { In, type EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  EntitySchemas,
  updateEntity,
  type TransactionEntity,
  type RefundRequestEntity,
  type RefundRequestAllocationEntity,
} from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  required,
  emit,
  pageWindow,
  paged,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  RefundRequestType,
  RefundStatus,
  TransactionPaymentGateway,
} from '@shared/domain/values/payment.values';
import { SubscriptionHistoryEvent } from '@shared/domain/values/subscription.values';
import { Payment, PAYMENT_REQUEST_ESCALATION_HOURS } from '../payment.domain';
import { Refund } from './refund.domain';
import { WalletUseCases } from '../wallet/wallet.use-case';
import {
  encryptPayoutDestination,
  decryptPayoutDestination,
} from '../payout-destination.crypto';

/** Booking, subscription-payment, and wallet refund request operations. */
@Injectable()
export class RefundUseCases {
  constructor(private readonly wallets: WalletUseCases) {}

  /**
   * Create one customer refund request for the eligible booking payments.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `createBookingRefundRequest`.
   * @throws {DomainError} Thrown when the actor is not authorized or the current state or data conflicts with the operation.
   */
  async customerRefund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentCustomerRefundCommandInput,
  ) {
    const { booking: accessibleBooking, user } = await bookingAccess(
      manager,
      actor,
      input.booking_id,
      'customer',
    );
    const booking = await manager.findOne(EntitySchemas.bookings, {
      where: { id: accessibleBooking.id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'Booking not found', 'missing');
    if (booking.status === 'completed') {
      const settlement = await manager.findOne(
        EntitySchemas.payment_escrow_settlements,
        {
          where: { booking_id: booking.id },
          lock: { mode: 'pessimistic_write' },
        },
      );
      ensure(
        settlement,
        'Refund window is unavailable for this completed booking',
        'conflict',
      );
      Payment.assertCompletedRefundWindowOpen(
        settlement.refund_request_deadline_at,
      );
    }
    const transactions = await this.lockPaidBookingTransactions(
      manager,
      booking.id,
    );
    ensure(
      transactions.length > 0 &&
        transactions.every((transaction) => transaction.user_id === user.id),
      'Refund is only available to the customer who paid for a booking',
      'forbidden',
    );
    return this.createBookingRefundRequest(
      manager,
      booking.id,
      transactions,
      user.id,
      RefundRequestType.CUSTOMER_REQUEST,
      input.amount,
      input.reason,
      input.idempotency_key ?? null,
    );
  }

  /**
   * Create a refund request after validating the transaction status and amount.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `createRefundRequest`.
   */
  async refund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundCommandInput,
  ) {
    role(actor, 'admin', 'system');
    const user = await currentUser(manager, actor);
    const candidate = await required(manager, 'transactions', input.payment_id);
    if (candidate.type === 'subscription') {
      const transaction = await this.lockTransaction(manager, candidate.id);
      ensure(
        transaction.status === 'paid' &&
          transaction.reference_id &&
          (transaction.checkout_review_required_at !== null ||
            transaction.checkout_review_resolution === 'paid_refund'),
        'Only a paid subscription payment under reconciliation review may be refunded',
        'conflict',
      );
      ensure(
        transaction.payment_gateway !==
          TransactionPaymentGateway.WALLET_INTERNAL,
        'Subscription payment refunds require an external payment source',
        'conflict',
      );
      const subscription = await required(
        manager,
        'subscriptions',
        transaction.reference_id,
      );
      ensure(
        !['pending', 'active'].includes(subscription.status) ||
          transaction.checkout_review_resolution === 'paid_refund',
        'Resolve the subscription checkout before requesting its refund',
        'conflict',
      );
      Payment.assertAmount(input.amount);
      ensure(
        input.amount === Number(transaction.amount),
        'A late subscription payment must be refunded in full',
        'conflict',
      );
      return this.createRefundRequest(
        manager,
        transaction,
        user.id,
        {
          ...input,
          idempotency_key:
            input.idempotency_key ??
            `subscription-review-refund:${transaction.id}:${
              transaction.checkout_review_required_at ??
              transaction.checkout_review_resolved_at ??
              transaction.id
            }`,
        },
        subscription.id,
      );
    }
    ensure(
      candidate.reference_id &&
        ['deposit', 'remaining'].includes(candidate.type),
      'Only booking payments may be refunded through this workflow',
      'conflict',
    );
    const booking = await manager.findOne(EntitySchemas.bookings, {
      where: { id: candidate.reference_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'Booking not found', 'missing');
    const sources = await this.lockPaidBookingTransactions(manager, booking.id);
    ensure(
      sources.some((source) => source.id === candidate.id),
      'Only paid booking payments may be refunded',
      'conflict',
    );
    return this.createBookingRefundRequest(
      manager,
      booking.id,
      sources,
      user.id,
      RefundRequestType.CUSTOMER_REQUEST,
      input.amount,
      input.reason,
      input.idempotency_key ?? null,
    );
  }

  /** Create one booking refund request and distribute it across paid source transactions. */
  private async createBookingRefundRequest(
    manager: EntityManager,
    bookingId: string,
    transactions: readonly TransactionEntity[],
    requestedBy: string | null,
    requestType:
      | typeof RefundRequestType.CUSTOMER_REQUEST
      | typeof RefundRequestType.BOOKING_CANCELLATION,
    amount: number,
    reason: string,
    idempotencyKey: string | null,
  ) {
    ensure(
      transactions.length > 0,
      'Booking has no paid transactions',
      'conflict',
    );
    const booking = await manager.findOne(EntitySchemas.bookings, {
      where: { id: bookingId },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'Booking not found', 'missing');
    const userId = transactions[0].user_id;
    ensure(
      transactions.every(
        (transaction) =>
          transaction.reference_id === bookingId &&
          transaction.user_id === userId &&
          transaction.status === 'paid' &&
          ['deposit', 'remaining'].includes(transaction.type),
      ),
      'Refund sources do not belong to the same paid booking',
      'conflict',
    );

    if (idempotencyKey) {
      const existing = await manager.findOneBy(EntitySchemas.refund_requests, {
        user_id: userId,
        idempotency_key: idempotencyKey,
      });
      if (existing) {
        ensure(
          existing.booking_id === bookingId &&
            existing.request_type === requestType &&
            Number(existing.amount) === amount &&
            existing.reason === reason,
          'Idempotency key was already used for another refund',
          'conflict',
        );
        return this.presentRefund(manager, existing);
      }
    }

    const existingCancellation =
      requestType === RefundRequestType.BOOKING_CANCELLATION
        ? await manager.findOneBy(EntitySchemas.refund_requests, {
            booking_id: bookingId,
            request_type: RefundRequestType.BOOKING_CANCELLATION,
          })
        : null;
    if (existingCancellation)
      return this.presentRefund(manager, existingCancellation);

    const sourceIds = transactions.map(({ id }) => id);
    const allocations = await manager.find(
      EntitySchemas.refund_request_allocations,
      { where: { transaction_id: In(sourceIds) } },
    );
    const refundIds = [
      ...new Set(allocations.map(({ refund_request_id }) => refund_request_id)),
    ];
    const requests = refundIds.length
      ? await manager.find(EntitySchemas.refund_requests, {
          where: { id: In(refundIds) },
        })
      : [];
    const statusByRequestId = new Map(
      requests.map((request) => [request.id, request.status]),
    );
    const reservedByTransaction = new Map<string, number>();
    for (const allocation of allocations) {
      if (
        statusByRequestId.get(allocation.refund_request_id) ===
        RefundStatus.REJECTED
      )
        continue;
      reservedByTransaction.set(
        allocation.transaction_id,
        (reservedByTransaction.get(allocation.transaction_id) ?? 0) +
          Number(allocation.amount),
      );
    }
    const availableByTransaction = transactions.map((transaction) => ({
      transaction,
      amount: Math.max(
        0,
        Number(transaction.amount) -
          (reservedByTransaction.get(transaction.id) ?? 0),
      ),
    }));
    const totalAvailable = availableByTransaction.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    ensure(totalAvailable > 0, 'No refundable balance remains', 'conflict');
    new Refund(totalAvailable, 'paid').assertRequest(amount, 0);

    const request = await manager.save(EntitySchemas.refund_requests, {
      request_type: requestType,
      transaction_id: null,
      booking_id: bookingId,
      subscription_id: null,
      wallet_id: null,
      user_id: userId,
      requested_by: requestedBy,
      amount,
      reserved_amount: 0,
      reason,
      status: RefundStatus.REQUESTED,
      idempotency_key: idempotencyKey,
      processing_due_at: Payment.requestProcessingDueAt(),
      sla_reminded_at: null,
      sla_escalated_at: null,
    });

    let amountToAllocate = amount;
    const requestAllocations: Array<
      Pick<RefundRequestAllocationEntity, 'transaction_id' | 'amount'> & {
        refund_request_id: string;
      }
    > = [];
    for (const item of availableByTransaction) {
      if (amountToAllocate <= 0) break;
      const allocationAmount = Math.min(item.amount, amountToAllocate);
      if (allocationAmount <= 0) continue;
      requestAllocations.push({
        refund_request_id: request.id,
        transaction_id: item.transaction.id,
        amount: allocationAmount,
      });
      amountToAllocate -= allocationAmount;
    }
    ensure(
      amountToAllocate === 0,
      'Refund could not be allocated to payments',
      'conflict',
    );
    await manager.save(
      EntitySchemas.refund_request_allocations,
      requestAllocations,
    );
    await emit(manager, 'payment.refund_requested', [userId], {
      refund_id: request.id,
      booking_id: bookingId,
      transaction_ids: requestAllocations.map(
        ({ transaction_id }) => transaction_id,
      ),
      amount: Number(request.amount),
    });
    return this.presentRefund(manager, request);
  }

  private async lockPaidBookingTransactions(
    manager: EntityManager,
    bookingId: string,
  ) {
    const candidates = await manager.find(EntitySchemas.transactions, {
      where: {
        reference_id: bookingId,
        status: 'paid',
        type: In(['deposit', 'remaining']),
      },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    const locked: TransactionEntity[] = [];
    for (const candidate of candidates) {
      const transaction = await this.lockTransaction(manager, candidate.id);
      if (transaction.status === 'paid') locked.push(transaction);
    }
    return locked;
  }

  private bookingRefundAllocations(manager: EntityManager, requestId: string) {
    return manager
      .createQueryBuilder(
        EntitySchemas.refund_request_allocations,
        'allocation',
      )
      .innerJoin(
        EntitySchemas.transactions,
        'source',
        'source.id = allocation.transaction_id',
      )
      .where('allocation.refund_request_id = :requestId', { requestId })
      .orderBy('source.created_at', 'ASC')
      .addOrderBy('source.id', 'ASC')
      .getMany();
  }

  /**
   * Create a subscription refund request linked to its payment transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param requestedBy Requester.
   * @param input Input data for the operation.
   * @returns Result returned by `presentRefund`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  private async createRefundRequest(
    manager: EntityManager,
    transaction: TransactionEntity,
    requestedBy: string,
    input: Inputs.PaymentRefundCommandInput,
    subscriptionId: string,
  ) {
    ensure(
      transaction.status === 'paid' &&
        transaction.type === 'subscription' &&
        transaction.reference_id === subscriptionId,
      'Only a paid subscription transaction can be refunded',
      'conflict',
    );
    Payment.assertAmount(input.amount);
    const existing = input.idempotency_key
      ? await manager.findOneBy(EntitySchemas.refund_requests, {
          user_id: transaction.user_id,
          idempotency_key: input.idempotency_key,
        })
      : null;
    if (existing) {
      ensure(
        existing.transaction_id === transaction.id &&
          existing.request_type === RefundRequestType.SUBSCRIPTION_PAYMENT &&
          existing.subscription_id === subscriptionId &&
          Number(existing.amount) === input.amount &&
          existing.reason === input.reason,
        'Idempotency key was already used for another refund',
        'conflict',
      );
      return this.presentRefund(manager, existing);
    }
    const requests = await manager.findBy(EntitySchemas.refund_requests, {
      transaction_id: transaction.id,
    });
    const reserved = requests
      .filter((request) => request.status !== RefundStatus.REJECTED)
      .reduce((sum, request) => sum + Number(request.amount), 0);
    new Refund(Number(transaction.amount), transaction.status).assertRequest(
      input.amount,
      reserved,
    );
    const request = await manager.save(EntitySchemas.refund_requests, {
      request_type: RefundRequestType.SUBSCRIPTION_PAYMENT,
      transaction_id: transaction.id,
      booking_id: null,
      subscription_id: subscriptionId,
      wallet_id: null,
      user_id: transaction.user_id,
      requested_by: requestedBy,
      amount: input.amount,
      reserved_amount: 0,
      reason: input.reason,
      status: RefundStatus.REQUESTED,
      idempotency_key: input.idempotency_key ?? null,
      processing_due_at: Payment.requestProcessingDueAt(),
      sla_reminded_at: null,
      sla_escalated_at: null,
    });
    await emit(manager, 'payment.refund_requested', [transaction.user_id], {
      refund_id: request.id,
      transaction_id: transaction.id,
      amount: Number(request.amount),
    });
    return this.presentRefund(manager, request);
  }

  /**
   * Create refund requests for canceled bookings using the supplied requester and reason.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param requestedBy Requester.
   * @param reason Reason for the operation.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async requestCancellationRefunds(
    manager: EntityManager,
    bookingId: string,
    requestedBy: string | null,
    reason: string | null,
  ) {
    const booking = await manager.findOne(EntitySchemas.bookings, {
      where: { id: bookingId },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'Booking not found', 'missing');
    const existingCancellation = await manager.findOneBy(
      EntitySchemas.refund_requests,
      {
        booking_id: bookingId,
        request_type: RefundRequestType.BOOKING_CANCELLATION,
      },
    );
    if (existingCancellation) return;

    const transactions = await this.lockPaidBookingTransactions(
      manager,
      bookingId,
    );
    if (!transactions.length) return;
    const sourceIds = transactions.map(({ id }) => id);
    const allocations = await manager.find(
      EntitySchemas.refund_request_allocations,
      { where: { transaction_id: In(sourceIds) } },
    );
    const requestIds = [
      ...new Set(allocations.map(({ refund_request_id }) => refund_request_id)),
    ];
    const requests = requestIds.length
      ? await manager.find(EntitySchemas.refund_requests, {
          where: { id: In(requestIds) },
        })
      : [];
    const statusByRequestId = new Map(
      requests.map((request) => [request.id, request.status]),
    );
    const reserved = allocations.reduce((sum, allocation) => {
      return statusByRequestId.get(allocation.refund_request_id) ===
        RefundStatus.REJECTED
        ? sum
        : sum + Number(allocation.amount);
    }, 0);
    const amount = Math.max(
      0,
      transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ) - reserved,
    );
    if (amount <= 0) return;

    await this.createBookingRefundRequest(
      manager,
      bookingId,
      transactions,
      requestedBy,
      RefundRequestType.BOOKING_CANCELLATION,
      amount,
      reason || 'Booking cancelled; refund requires review',
      `booking-cancellation:${bookingId}`,
    );
  }

  /**
   * Approve a refund request after checking permissions and its current status.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `presentRefund`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async approveRefund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundReviewCommandInput,
  ) {
    role(actor, 'admin');
    const reviewer = await currentUser(manager, actor);
    const request = await this.lockRefundRequest(
      manager,
      input.refund_request_id,
    );
    if (request.status === RefundStatus.APPROVED)
      return this.presentRefund(manager, request);
    ensure(
      request.status === RefundStatus.REQUESTED,
      'Only requested refunds can be approved',
      'conflict',
    );

    if (request.request_type === RefundRequestType.WALLET_WITHDRAWAL) {
      ensure(
        request.payout_destination_encrypted,
        'Withdrawal payout destination is missing',
        'conflict',
      );
      await updateEntity(manager, EntitySchemas.refund_requests, request.id, {
        status: RefundStatus.APPROVED,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        processing_due_at: Payment.requestProcessingDueAt(),
        sla_reminded_at: null,
        sla_escalated_at: null,
      });
    } else if (
      request.request_type === RefundRequestType.SUBSCRIPTION_PAYMENT
    ) {
      ensure(
        request.subscription_id,
        'Subscription reference is missing from refund request',
        'conflict',
      );
      const transaction = await this.lockTransaction(
        manager,
        request.transaction_id!,
      );
      ensure(
        transaction.status === 'paid' &&
          transaction.type === 'subscription' &&
          transaction.reference_id === request.subscription_id &&
          transaction.payment_gateway !==
            TransactionPaymentGateway.WALLET_INTERNAL,
        'Refund source is not a paid subscription transaction',
        'conflict',
      );
      await required(manager, 'subscriptions', request.subscription_id);
      let payoutDestination = request.payout_destination_encrypted;
      if (input.payout_destination)
        payoutDestination = encryptPayoutDestination(input.payout_destination);
      ensure(
        payoutDestination,
        'Add a payout destination before approving an external refund',
        'conflict',
      );
      await updateEntity(manager, EntitySchemas.refund_requests, request.id, {
        status: RefundStatus.APPROVED,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        reserved_amount: 0,
        payout_destination_encrypted: payoutDestination,
        processing_due_at: Payment.requestProcessingDueAt(),
        sla_reminded_at: null,
        sla_escalated_at: null,
      });
    } else {
      ensure(
        request.booking_id,
        'Only booking refunds can be approved by this workflow',
        'conflict',
      );
      const booking = await manager.findOne(EntitySchemas.bookings, {
        where: { id: request.booking_id },
        lock: { mode: 'pessimistic_write' },
      });
      ensure(booking, 'Booking not found', 'missing');
      if (request.request_type === RefundRequestType.BOOKING_CANCELLATION)
        ensure(
          ['cancelled', 'rejected', 'expired'].includes(booking.status),
          'Booking must be ended before its cancellation refund is approved',
          'conflict',
        );
      if (request.request_type === RefundRequestType.CUSTOMER_REQUEST)
        ensure(
          ['cancelled', 'rejected', 'expired', 'completed'].includes(
            booking.status,
          ),
          'Booking must be ended before a customer refund is approved',
          'conflict',
        );
      const allocations = await this.bookingRefundAllocations(
        manager,
        request.id,
      );
      ensure(
        allocations.length > 0,
        'Booking refund allocations are missing',
        'conflict',
      );
      const sources: Array<{
        allocation: RefundRequestAllocationEntity;
        transaction: TransactionEntity;
      }> = [];
      for (const allocation of allocations) {
        const transaction = await this.lockTransaction(
          manager,
          allocation.transaction_id,
        );
        ensure(
          transaction.status === 'paid' &&
            ['deposit', 'remaining'].includes(transaction.type) &&
            transaction.reference_id === booking.id,
          'Refund source transaction is no longer a paid payment for this booking',
          'conflict',
        );
        sources.push({ allocation, transaction });
      }
      const photographer = await required(
        manager,
        'photographers',
        booking.photographer_id,
      );
      let payoutDestination = request.payout_destination_encrypted;
      const hasExternalSource = sources.some(
        ({ transaction }) =>
          transaction.payment_gateway !==
          TransactionPaymentGateway.WALLET_INTERNAL,
      );
      if (hasExternalSource) {
        if (input.payout_destination)
          payoutDestination = encryptPayoutDestination(
            input.payout_destination,
          );
        ensure(
          payoutDestination,
          'Add a payout destination before approving an external refund',
          'conflict',
        );
      }
      let reservedAmount = 0;
      for (const { allocation, transaction } of sources) {
        const allocationReserved = await this.wallets.reserveRefund(
          manager,
          request.id,
          transaction,
          photographer.user_id,
          Number(allocation.amount),
        );
        await updateEntity(
          manager,
          EntitySchemas.refund_request_allocations,
          allocation.id,
          { reserved_amount: allocationReserved },
        );
        reservedAmount += allocationReserved;
      }
      await updateEntity(manager, EntitySchemas.refund_requests, request.id, {
        status: RefundStatus.APPROVED,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        reserved_amount: reservedAmount,
        payout_destination_encrypted: payoutDestination,
        processing_due_at: Payment.requestProcessingDueAt(),
        sla_reminded_at: null,
        sla_escalated_at: null,
      });
    }
    const updated = await required(manager, 'refund_requests', request.id);
    await emit(manager, 'payment.refund_approved', [request.user_id], {
      refund_id: request.id,
      amount: Number(request.amount),
    });
    return this.presentRefund(manager, updated);
  }

  /**
   * Reject a refund request and record the reason.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `presentRefund`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async rejectRefund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundReviewCommandInput,
  ) {
    role(actor, 'admin');
    const reviewer = await currentUser(manager, actor);
    const request = await this.lockRefundRequest(
      manager,
      input.refund_request_id,
    );
    if (request.status === RefundStatus.REJECTED)
      return this.presentRefund(manager, request);
    ensure(
      request.status === RefundStatus.REQUESTED,
      'Only requested refunds can be rejected',
      'conflict',
    );
    if (request.request_type === RefundRequestType.WALLET_WITHDRAWAL)
      await this.wallets.rejectWithdrawal(
        manager,
        request.id,
        request.user_id,
        Number(request.amount),
      );
    const updated = await updateEntity(
      manager,
      EntitySchemas.refund_requests,
      request.id,
      {
        status: RefundStatus.REJECTED,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: input.reason ?? 'Request rejected by administrator',
      },
    );
    if (
      request.booking_id &&
      (request.request_type === RefundRequestType.BOOKING_CANCELLATION ||
        request.request_type === RefundRequestType.CUSTOMER_REQUEST)
    ) {
      const booking = await required(manager, 'bookings', request.booking_id);
      if (
        ['cancelled', 'rejected', 'expired', 'completed'].includes(
          booking.status,
        )
      )
        await this.wallets.releaseBookingEscrow(
          manager,
          booking.id,
          `refund-rejected:${request.id}`,
        );
    }
    if (
      request.request_type === RefundRequestType.SUBSCRIPTION_PAYMENT &&
      request.transaction_id &&
      request.subscription_id
    ) {
      const source = await this.lockTransaction(
        manager,
        request.transaction_id,
      );
      if (
        source.status === 'paid' &&
        source.checkout_review_resolution === 'paid_refund'
      ) {
        const now = new Date().toISOString();
        await updateEntity(manager, EntitySchemas.transactions, source.id, {
          checkout_review_required_at: now,
          checkout_reconciliation_next_at: null,
        });
        const subscription = await required(
          manager,
          'subscriptions',
          request.subscription_id,
        );
        await manager.save(EntitySchemas.subscription_status_history, {
          subscription_id: subscription.id,
          event_type: SubscriptionHistoryEvent.PAYMENT_RECONCILED,
          from_status: subscription.status,
          to_status: subscription.status,
          actor_user_id: reviewer.id,
          actor_role: 'admin',
          transaction_id: source.id,
          note: 'Refund request was rejected; the payment requires another administrator decision.',
        });
      }
    }
    await emit(manager, 'payment.refund_rejected', [request.user_id], {
      refund_id: request.id,
      reason: updated.rejection_reason,
    });
    return this.presentRefund(manager, updated);
  }

  /**
   * Mark a refund request as processed and update the related transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `presentRefund`.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async completeRefund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundCompleteCommandInput,
  ) {
    role(actor, 'admin');
    const operator = await currentUser(manager, actor);
    const request = await this.lockRefundRequest(
      manager,
      input.refund_request_id,
    );
    if (request.status === RefundStatus.COMPLETED)
      return this.presentRefund(manager, request);
    ensure(
      request.status === RefundStatus.APPROVED,
      'Only approved requests can be completed',
      'conflict',
    );

    let transaction: TransactionEntity | null = null;
    const completedTransactions: TransactionEntity[] = [];
    if (request.request_type === RefundRequestType.WALLET_WITHDRAWAL) {
      ensure(
        input.payout_reference,
        'Payout reference is required to complete a withdrawal',
      );
      const wallet = await required(manager, 'wallets', request.wallet_id!);
      transaction = await manager.save(EntitySchemas.transactions, {
        user_id: request.user_id,
        transaction_code: `withdrawal:${request.id}`,
        type: 'withdrawal',
        reference_id: wallet.id,
        direction: 'out',
        amount: Number(request.amount),
        payment_gateway: TransactionPaymentGateway.BANK_TRANSFER,
        provider_order_code: null,
        status: 'paid',
        idempotency_key: `withdrawal:${request.id}`,
        description: 'Wallet withdrawal paid by administrator',
      });
      await this.wallets.completeWithdrawal(
        manager,
        request.id,
        request.user_id,
        Number(request.amount),
        transaction.id,
      );
    } else if (
      request.request_type === RefundRequestType.SUBSCRIPTION_PAYMENT
    ) {
      ensure(
        request.subscription_id,
        'Subscription reference is missing from refund request',
        'conflict',
      );
      const source = await this.lockTransaction(
        manager,
        request.transaction_id!,
      );
      ensure(
        source.status === 'paid' &&
          source.type === 'subscription' &&
          source.reference_id === request.subscription_id &&
          source.payment_gateway !== TransactionPaymentGateway.WALLET_INTERNAL,
        'Refund source is not a paid subscription transaction',
        'conflict',
      );
      ensure(
        input.payout_reference,
        'Payout reference is required for an external subscription refund',
      );
      ensure(
        request.payout_destination_encrypted,
        'Refund payout destination is missing',
        'conflict',
      );
      const subscription = await required(
        manager,
        'subscriptions',
        request.subscription_id,
      );
      transaction = await manager.save(EntitySchemas.transactions, {
        user_id: request.user_id,
        transaction_code: `refund:${request.id}`,
        type: 'refund',
        reference_id: subscription.id,
        direction: 'out',
        amount: Number(request.amount),
        payment_gateway: TransactionPaymentGateway.BANK_TRANSFER,
        provider_order_code: null,
        status: 'paid',
        idempotency_key: `refund:${request.id}`,
        description: `Refund for subscription payment ${source.transaction_code}`,
      });
      await manager.save(EntitySchemas.subscription_status_history, {
        subscription_id: subscription.id,
        event_type: SubscriptionHistoryEvent.PAYMENT_REFUNDED,
        from_status: subscription.status,
        to_status: subscription.status,
        actor_user_id: operator.id,
        actor_role: 'admin',
        transaction_id: source.id,
        note: 'Late subscription payment refund completed.',
      });
    } else {
      ensure(request.booking_id, 'Booking reference is missing', 'conflict');
      const booking = await required(manager, 'bookings', request.booking_id);
      const photographer = await required(
        manager,
        'photographers',
        booking.photographer_id,
      );
      const allocations = await this.bookingRefundAllocations(
        manager,
        request.id,
      );
      ensure(
        allocations.length > 0,
        'Booking refund allocations are missing',
        'conflict',
      );
      ensure(
        allocations.reduce(
          (sum, allocation) => sum + Number(allocation.amount),
          0,
        ) === Number(request.amount),
        'Booking refund allocation total does not match the request amount',
        'conflict',
      );
      const sources: Array<{
        allocation: RefundRequestAllocationEntity;
        transaction: TransactionEntity;
      }> = [];
      for (const allocation of allocations) {
        const source = await this.lockTransaction(
          manager,
          allocation.transaction_id,
        );
        ensure(
          source.status === 'paid' &&
            ['deposit', 'remaining'].includes(source.type) &&
            source.reference_id === booking.id,
          'Refund source transaction is no longer a paid payment for this booking',
          'conflict',
        );
        sources.push({ allocation, transaction: source });
      }
      const hasExternalSource = sources.some(
        ({ transaction: source }) =>
          source.payment_gateway !== TransactionPaymentGateway.WALLET_INTERNAL,
      );
      if (hasExternalSource) {
        ensure(
          input.payout_reference,
          'Payout reference is required for an external refund',
        );
        ensure(
          request.payout_destination_encrypted,
          'Refund payout destination is missing',
          'conflict',
        );
      }
      for (const { allocation, transaction: source } of sources) {
        const internal =
          source.payment_gateway === TransactionPaymentGateway.WALLET_INTERNAL;
        await this.wallets.completeRefund(
          manager,
          request.id,
          source,
          request.user_id,
          photographer.user_id,
          Number(allocation.amount),
          internal,
        );
        const refundTransaction = await manager.save(
          EntitySchemas.transactions,
          {
            user_id: request.user_id,
            transaction_code: `refund:${request.id}:${allocation.id}`,
            type: 'refund',
            reference_id: booking.id,
            direction: 'out',
            amount: Number(allocation.amount),
            payment_gateway: internal
              ? TransactionPaymentGateway.WALLET_INTERNAL
              : TransactionPaymentGateway.BANK_TRANSFER,
            provider_order_code: null,
            status: 'paid',
            idempotency_key: `refund:${request.id}:${allocation.id}`,
            description: `Refund for payment ${source.transaction_code}`,
          },
        );
        await updateEntity(
          manager,
          EntitySchemas.refund_request_allocations,
          allocation.id,
          { completed_transaction_id: refundTransaction.id },
        );
        completedTransactions.push(refundTransaction);
      }
    }

    const updated = await updateEntity(
      manager,
      EntitySchemas.refund_requests,
      request.id,
      {
        status: RefundStatus.COMPLETED,
        completed_by: operator.id,
        completed_at: new Date().toISOString(),
        payout_reference: input.payout_reference ?? null,
        completed_transaction_id:
          transaction?.id ??
          (completedTransactions.length === 1
            ? completedTransactions[0].id
            : null),
      },
    );
    await emit(manager, 'payment.refund_completed', [request.user_id], {
      refund_id: request.id,
      transaction_id: transaction?.id ?? null,
      transaction_ids: completedTransactions.map(({ id }) => id),
      amount: Number(request.amount),
    });
    return this.presentRefund(manager, updated);
  }

  /**
   * Extend an active refund or withdrawal processing deadline and write an audit record.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Administrator performing the extension.
   * @param input Request ID, extension hours, and required reason.
   * @param now Current time in milliseconds.
   * @returns Updated request with its safe payout destination representation.
   * @throws {DomainError} Thrown when the actor is unauthorized, the request is inactive, or the extension is invalid.
   */
  async extendProcessingDeadline(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentDeadlineExtensionInput,
    now = Date.now(),
  ) {
    role(actor, 'admin');
    ensure(input.reason.trim().length > 0, 'An extension reason is required');
    ensure(input.reason.length <= 1000, 'Extension reason is too long');
    const admin = await currentUser(manager, actor);
    const request = await this.lockRefundRequest(
      manager,
      input.refund_request_id,
    );
    ensure(
      request.status === RefundStatus.REQUESTED ||
        request.status === RefundStatus.APPROVED,
      'Only active refund or withdrawal requests can be extended',
      'conflict',
    );
    ensure(
      request.processing_due_at,
      'Processing deadline is unavailable',
      'conflict',
    );
    const previousDueAt = request.processing_due_at;
    const newDueAt = Payment.extendProcessingDeadline(
      previousDueAt,
      input.hours,
      now,
    );
    const updated = await updateEntity(
      manager,
      EntitySchemas.refund_requests,
      request.id,
      {
        processing_due_at: newDueAt,
        sla_reminded_at: null,
        sla_escalated_at: null,
        deadline_extension_count: request.deadline_extension_count + 1,
      },
    );
    await manager.save(EntitySchemas.payment_request_deadline_extensions, {
      refund_request_id: request.id,
      extended_by: admin.id,
      previous_due_at: previousDueAt,
      new_due_at: newDueAt,
      extension_hours: input.hours,
      reason: input.reason.trim(),
    });
    await emit(
      manager,
      'payment.request_deadline_extended',
      [request.user_id, admin.id],
      {
        request_id: request.id,
        request_type: request.request_type,
        previous_due_at: previousDueAt,
        processing_due_at: newDueAt,
        extension_hours: input.hours,
        reason: input.reason.trim(),
      },
    );
    return this.presentRefund(manager, updated);
  }

  /**
   * Remind and escalate administrators about overdue active refund and withdrawal requests.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the scheduled operation; must have the `system` role.
   * @param now Current time in milliseconds.
   * @returns Object containing the number of requests whose SLA markers were updated.
   * @throws {DomainError} Thrown when the actor is unauthorized.
   */
  async processOverduePaymentRequests(
    manager: EntityManager,
    actor: Actor,
    now = Date.now(),
  ) {
    role(actor, 'system');
    const nowIso = new Date(now).toISOString();
    const requests = await manager
      .createQueryBuilder(EntitySchemas.refund_requests, 'request')
      .where('request.status IN (:...statuses)', {
        statuses: [RefundStatus.REQUESTED, RefundStatus.APPROVED],
      })
      .andWhere('request.processing_due_at IS NOT NULL')
      .andWhere(
        `((request.sla_reminded_at IS NULL AND request.processing_due_at <= :now)
          OR (request.sla_escalated_at IS NULL AND request.processing_due_at + (:escalationHours * INTERVAL '1 hour') <= :now))`,
        { now: nowIso, escalationHours: PAYMENT_REQUEST_ESCALATION_HOURS },
      )
      .orderBy('request.processing_due_at', 'ASC')
      .addOrderBy('request.id', 'ASC')
      .take(100)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
    if (!requests.length) return { processed: 0 };

    const admins = await manager.findBy(EntitySchemas.admins, {
      is_active: true,
    });
    const adminIds = admins.map((admin) => admin.user_id);
    if (!adminIds.length) return { processed: 0 };

    let processed = 0;
    for (const request of requests) {
      const dueAt = Date.parse(request.processing_due_at!);
      const remind = !request.sla_reminded_at && dueAt <= now;
      const escalate =
        !request.sla_escalated_at &&
        dueAt + PAYMENT_REQUEST_ESCALATION_HOURS * 36e5 <= now;
      if (!remind && !escalate) continue;

      await updateEntity(manager, EntitySchemas.refund_requests, request.id, {
        ...(remind ? { sla_reminded_at: nowIso } : {}),
        ...(escalate ? { sla_escalated_at: nowIso } : {}),
      });
      const payload = {
        request_id: request.id,
        request_type: request.request_type,
        status: request.status,
        user_id: request.user_id,
        amount: Number(request.amount),
        processing_due_at: request.processing_due_at,
        overdue_hours: Math.max(0, Math.floor((now - dueAt) / 36e5)),
      };
      if (remind)
        await emit(manager, 'payment.request_sla_reminder', adminIds, payload);
      if (escalate)
        await emit(manager, 'payment.request_sla_escalated', adminIds, payload);
      processed++;
    }
    return { processed };
  }

  /**
   * List the current user’s refund requests using the supplied pagination filters.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param query Query filters and pagination options.
   * @returns Result returned by `paged`.
   */
  async myRefundRequests(
    manager: EntityManager,
    actor: Actor,
    query: Inputs.PaymentAdminQueryInput,
  ) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(manager, actor);
    const { limit, offset } = pageWindow(query);
    const [items, total] = await manager
      .createQueryBuilder(EntitySchemas.refund_requests, 'request')
      .where('request.user_id = :userId', { userId: user.id })
      .orderBy('request.created_at', 'DESC')
      .addOrderBy('request.id', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    return paged(
      await Promise.all(items.map((item) => this.presentRefund(manager, item))),
      total,
      query,
    );
  }

  /**
   * List refund requests for admins using the supplied pagination filters.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param query Query filters and pagination options.
   * @returns Result returned by `paged`.
   */
  async adminRefundRequests(
    manager: EntityManager,
    actor: Actor,
    query: Inputs.PaymentAdminQueryInput & { status?: string },
  ) {
    role(actor, 'admin');
    await currentUser(manager, actor);
    const { limit, offset } = pageWindow(query);
    const builder = manager.createQueryBuilder(
      EntitySchemas.refund_requests,
      'request',
    );
    if (query.status)
      builder.andWhere('request.status = :status', { status: query.status });
    const [items, total] = await builder
      .orderBy(
        `CASE WHEN request.status IN ('requested', 'approved') THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy(
        `CASE WHEN request.status IN ('requested', 'approved') THEN request.processing_due_at END`,
        'ASC',
      )
      .addOrderBy('request.created_at', 'ASC')
      .addOrderBy('request.id', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    return paged(
      await Promise.all(items.map((item) => this.presentRefund(manager, item))),
      total,
      query,
    );
  }

  /**
   * Map a refund request to a safe response shape for the API.
   *
   * @param request Request to send or process.
   * @returns Result object containing the fields `payout_destination`.
   */
  private async presentRefund(
    manager: EntityManager,
    request: RefundRequestEntity,
  ) {
    const { payout_destination_encrypted, ...publicRequest } = request;
    const allocations = request.booking_id
      ? await this.bookingRefundAllocations(manager, request.id)
      : [];
    return {
      ...publicRequest,
      allocations,
      payout_destination: decryptPayoutDestination(
        payout_destination_encrypted,
      ),
    };
  }

  /**
   * Check whether the caller may access the requested transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param id ID of the record to process.
   * @returns Processed transaction value.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async access(manager: EntityManager, actor: Actor, id: string) {
    const transaction = await required(manager, 'transactions', id);
    const user = await currentUser(manager, actor);
    if (transaction.user_id !== user.id && !actor.roles.includes('admin')) {
      ensure(
        ['deposit', 'remaining'].includes(transaction.type) &&
          transaction.reference_id,
        'Payment access denied',
        'forbidden',
      );
      await bookingAccess(manager, actor, transaction.reference_id);
    }
    return transaction;
  }

  /**
   * List refund requests associated with the specified transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `items`.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async refunds(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundsQueryInput,
  ) {
    const transaction = await this.access(manager, actor, input.payment_id);
    const user = await currentUser(manager, actor);
    ensure(
      transaction.user_id === user.id || actor.roles.includes('admin'),
      'Refund access denied',
      'forbidden',
    );
    const directRequests = await manager.find(EntitySchemas.refund_requests, {
      where: { transaction_id: input.payment_id },
    });
    const allocations = await manager.find(
      EntitySchemas.refund_request_allocations,
      { where: { transaction_id: input.payment_id } },
    );
    const allocationRequestIds = allocations.map(
      ({ refund_request_id }) => refund_request_id,
    );
    const allocatedRequests = allocationRequestIds.length
      ? await manager.find(EntitySchemas.refund_requests, {
          where: { id: In(allocationRequestIds) },
        })
      : [];
    const byId = new Map(
      [...directRequests, ...allocatedRequests].map((request) => [
        request.id,
        request,
      ]),
    );
    const items = [...byId.values()].sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id),
    );
    return {
      items: await Promise.all(
        items.map((item) => this.presentRefund(manager, item)),
      ),
    };
  }

  /**
   * Lock a transaction before validating or creating a refund request.
   *
   * @param manager EntityManager for the current transaction.
   * @param id Transaction ID to lock.
   * @returns The locked transaction record.
   * @throws {DomainError} Thrown when the transaction does not exist.
   */
  private async lockTransaction(manager: EntityManager, id: string) {
    const transaction = await manager.findOne(EntitySchemas.transactions, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(transaction, 'Transaction not found', 'missing');
    return transaction;
  }

  /**
   * Lock a refund request before approving or completing it.
   *
   * @param manager EntityManager for the current transaction.
   * @param id ID of the record to process.
   * @returns Processed request value.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  private async lockRefundRequest(manager: EntityManager, id: string) {
    const request = await manager.findOne(EntitySchemas.refund_requests, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(request, 'Refund request not found', 'missing');
    return request;
  }
}
