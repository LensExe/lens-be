import { In, type EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  EntitySchemas,
  updateEntity,
  type TransactionEntity,
  type RefundRequestEntity,
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
import { Payment, PAYMENT_REQUEST_ESCALATION_HOURS } from '../payment.domain';
import { Refund } from './refund.domain';
import { WalletUseCases } from '../wallet/wallet.use-case';
import {
  encryptPayoutDestination,
  decryptPayoutDestination,
} from '../payout-destination.crypto';

/** Booking and wallet refund request operations. */
@Injectable()
export class RefundUseCases {
  constructor(private readonly wallets: WalletUseCases) {}

  /**
   * Create a customer refund request for an eligible transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `createRefundRequest`.
   * @throws {DomainError} Thrown when the actor is not authorized or the current state or data conflicts with the operation.
   */
  async customerRefund(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRefundCommandInput,
  ) {
    const candidate = await manager.findOneBy(EntitySchemas.transactions, {
      id: input.id,
    });
    ensure(candidate, 'Transaction not found', 'missing');
    ensure(candidate.reference_id, 'Booking reference is missing', 'conflict');
    const { booking: accessibleBooking, user } = await bookingAccess(
      manager,
      actor,
      candidate.reference_id,
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
    const transaction = await this.lockTransaction(manager, input.id);
    ensure(
      transaction.user_id === user.id &&
        transaction.reference_id === booking.id &&
        ['deposit', 'remaining'].includes(transaction.type),
      'Refund is only available to the customer who paid for a booking',
      'forbidden',
    );
    return this.createRefundRequest(
      manager,
      transaction,
      user.id,
      input,
      RefundRequestType.CUSTOMER_REQUEST,
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
    const transaction = await this.lockTransaction(manager, input.id);
    return this.createRefundRequest(
      manager,
      transaction,
      user.id,
      input,
      RefundRequestType.CUSTOMER_REQUEST,
    );
  }

  /**
   * Create a refund request linked to the transaction and requester.
   *
   * @param manager EntityManager for the current transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param requestedBy Requester.
   * @param input Input data for the operation.
   * @param requestType Request type.
   * @returns Result returned by `presentRefund`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  private async createRefundRequest(
    manager: EntityManager,
    transaction: TransactionEntity,
    requestedBy: string,
    input: Inputs.PaymentRefundCommandInput,
    requestType: typeof RefundRequestType.CUSTOMER_REQUEST,
  ) {
    ensure(
      transaction.status === 'paid' &&
        ['deposit', 'remaining'].includes(transaction.type) &&
        transaction.reference_id,
      'Only paid booking transactions may be refunded',
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
          Number(existing.amount) === input.amount &&
          existing.reason === input.reason,
        'Idempotency key was already used for another refund',
        'conflict',
      );
      return this.presentRefund(existing);
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
      request_type: requestType,
      transaction_id: transaction.id,
      booking_id: transaction.reference_id,
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
    return this.presentRefund(request);
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
    const [booking] = await manager.findBy(EntitySchemas.bookings, {
      id: bookingId,
    });
    ensure(booking, 'Booking not found', 'missing');
    const transactions = await manager.findBy(EntitySchemas.transactions, {
      reference_id: bookingId,
      status: 'paid',
      type: In(['deposit', 'remaining']),
    });
    for (const row of transactions) {
      const transaction = await this.lockTransaction(manager, row.id);
      const existingCancellation = await manager.findOneBy(
        EntitySchemas.refund_requests,
        {
          request_type: RefundRequestType.BOOKING_CANCELLATION,
          transaction_id: transaction.id,
          booking_id: bookingId,
        },
      );
      if (existingCancellation) continue;
      const requests = await manager.findBy(EntitySchemas.refund_requests, {
        transaction_id: transaction.id,
      });
      const reserved = requests
        .filter((request) => request.status !== RefundStatus.REJECTED)
        .reduce((sum, request) => sum + Number(request.amount), 0);
      const amount = Number(transaction.amount) - reserved;
      if (amount <= 0) continue;
      const request = await manager.save(EntitySchemas.refund_requests, {
        request_type: RefundRequestType.BOOKING_CANCELLATION,
        transaction_id: transaction.id,
        booking_id: bookingId,
        wallet_id: null,
        user_id: transaction.user_id,
        requested_by: requestedBy,
        amount,
        reserved_amount: 0,
        reason: reason || 'Booking cancelled; refund requires review',
        status: RefundStatus.REQUESTED,
        processing_due_at: Payment.requestProcessingDueAt(),
        sla_reminded_at: null,
        sla_escalated_at: null,
      });
      await emit(manager, 'payment.refund_requested', [transaction.user_id], {
        refund_id: request.id,
        transaction_id: transaction.id,
        amount,
      });
    }
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
    const request = await this.lockRefundRequest(manager, input.id);
    if (request.status === RefundStatus.APPROVED)
      return this.presentRefund(request);
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
    } else {
      ensure(
        request.booking_id,
        'Only booking refunds can be approved by this workflow',
        'conflict',
      );
      const transaction = await this.lockTransaction(
        manager,
        request.transaction_id!,
      );
      ensure(
        transaction.status === 'paid',
        'Refund source transaction is no longer paid',
        'conflict',
      );
      const booking = await required(manager, 'bookings', request.booking_id);
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
      const photographer = await required(
        manager,
        'photographers',
        booking.photographer_id,
      );
      let payoutDestination = request.payout_destination_encrypted;
      if (
        transaction.payment_gateway !==
        TransactionPaymentGateway.WALLET_INTERNAL
      ) {
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
      const reservedAmount = await this.wallets.reserveRefund(
        manager,
        request.id,
        transaction,
        photographer.user_id,
        Number(request.amount),
      );
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
    return this.presentRefund(updated);
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
    const request = await this.lockRefundRequest(manager, input.id);
    if (request.status === RefundStatus.REJECTED)
      return this.presentRefund(request);
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
      request.transaction_id &&
      request.request_type !== RefundRequestType.WALLET_WITHDRAWAL
    ) {
      const booking = await required(manager, 'bookings', request.booking_id!);
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
    await emit(manager, 'payment.refund_rejected', [request.user_id], {
      refund_id: request.id,
      reason: updated.rejection_reason,
    });
    return this.presentRefund(updated);
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
    const request = await this.lockRefundRequest(manager, input.id);
    if (request.status === RefundStatus.COMPLETED)
      return this.presentRefund(request);
    ensure(
      request.status === RefundStatus.APPROVED,
      'Only approved requests can be completed',
      'conflict',
    );

    let transaction: TransactionEntity;
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
    } else {
      const source = await this.lockTransaction(
        manager,
        request.transaction_id!,
      );
      const booking = await required(manager, 'bookings', request.booking_id!);
      const photographer = await required(
        manager,
        'photographers',
        booking.photographer_id,
      );
      const internal =
        source.payment_gateway === TransactionPaymentGateway.WALLET_INTERNAL;
      if (!internal) {
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
      await this.wallets.completeRefund(
        manager,
        request.id,
        source,
        request.user_id,
        photographer.user_id,
        Number(request.amount),
        internal,
      );
      transaction = await manager.save(EntitySchemas.transactions, {
        user_id: request.user_id,
        transaction_code: `refund:${request.id}`,
        type: 'refund',
        reference_id: booking.id,
        direction: 'out',
        amount: Number(request.amount),
        payment_gateway: internal
          ? TransactionPaymentGateway.WALLET_INTERNAL
          : TransactionPaymentGateway.BANK_TRANSFER,
        provider_order_code: null,
        status: 'paid',
        idempotency_key: `refund:${request.id}`,
        description: `Refund for payment ${source.transaction_code}`,
      });
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
        completed_transaction_id: transaction.id,
      },
    );
    await emit(manager, 'payment.refund_completed', [request.user_id], {
      refund_id: request.id,
      transaction_id: transaction.id,
      amount: Number(request.amount),
    });
    return this.presentRefund(updated);
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
    const request = await this.lockRefundRequest(manager, input.id);
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
    return this.presentRefund(updated);
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
      items.map((item) => this.presentRefund(item)),
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
      items.map((item) => this.presentRefund(item)),
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
  private presentRefund(request: RefundRequestEntity) {
    const { payout_destination_encrypted, ...publicRequest } = request;
    return {
      ...publicRequest,
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
    const transaction = await this.access(manager, actor, input.id);
    const user = await currentUser(manager, actor);
    ensure(
      transaction.user_id === user.id || actor.roles.includes('admin'),
      'Refund access denied',
      'forbidden',
    );
    const items = await manager.find(EntitySchemas.refund_requests, {
      where: { transaction_id: input.id },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    return { items: items.map((item) => this.presentRefund(item)) };
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
