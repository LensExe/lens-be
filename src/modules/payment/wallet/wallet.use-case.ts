import { In, type EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas, updateEntity } from '@shared/database';
import type { TransactionEntity } from '@shared/database/entities/transaction.entity';
import type { WalletEntity } from '@shared/database/entities/wallet.entity';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { PaymentGateway } from '@shared/integrations/payment/port/payment.port';
import type * as Inputs from '@shared/contracts/contracts';
import { emit } from '@shared/common/access';
import {
  RefundRequestType,
  RefundStatus,
} from '@shared/domain/values/payment.values';
import type { RefundRequestEntity } from '@shared/database/entities/refund-request.entity';
import type { WalletPayoutDestinationEntity } from '@shared/database/entities/wallet-payout-destination.entity';
import { Wallet } from './wallet.domain';
import {
  encryptPayoutDestination,
  decryptPayoutDestination,
} from '../payout-destination.crypto';
import type { Actor } from '@shared/platform/auth/actor';
import { currentUser, pageWindow, role } from '@shared/common/access';
import { Payment } from '../payment.domain';

@Injectable()
export class WalletUseCases {
  constructor(private readonly gateway: PaymentGateway) {}

  /**
   * Get the current user’s wallet after checking the caller’s role.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @returns Result returned by `get`.
   */
  async current(s: EntityManager, actor: Actor) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(s, actor);
    return this.get(s, user.id);
  }

  /**
   * Get the current user’s wallet ledger using the page limit and offset.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param query Query filters and pagination options.
   * @returns Result returned by `ledger`.
   */
  async currentLedger(
    s: EntityManager,
    actor: Actor,
    query: { limit?: number; offset?: number },
  ) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(s, actor);
    const { limit, offset } = pageWindow(query);
    return this.ledger(s, user.id, limit, offset);
  }

  /** Return the current user's saved payout destination with the account number masked. */
  async currentPayoutDestination(s: EntityManager, actor: Actor) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(s, actor);
    const destination = await s.findOneBy(
      EntitySchemas.wallet_payout_destinations,
      { user_id: user.id },
    );
    return this.presentPayoutDestination(destination);
  }

  /** Save or replace the current user's encrypted default payout destination. */
  async savePayoutDestination(
    s: EntityManager,
    actor: Actor,
    input: Inputs.PaymentPayoutDestinationInput,
  ) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(s, actor);
    // Serialize destination changes with withdrawals through the wallet row lock.
    await this.lockWallet(s, user.id);
    const existing = await s.findOneBy(
      EntitySchemas.wallet_payout_destinations,
      { user_id: user.id },
    );
    const destination = await s.save(
      EntitySchemas.wallet_payout_destinations,
      existing
        ? {
            ...existing,
            payout_destination_encrypted: encryptPayoutDestination(input),
          }
        : {
            user_id: user.id,
            payout_destination_encrypted: encryptPayoutDestination(input),
          },
    );
    return this.presentPayoutDestination(destination);
  }

  /**
   * Create a wallet deposit transaction and payment URL for the current user.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `save`.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async topUpIntent(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentTopUpCommandInput,
  ) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(manager, actor);
    Wallet.assertTopUpAmount(input.amount);
    const wallet = await this.lockWallet(manager, user.id);
    const existing = await manager.findOneBy(EntitySchemas.transactions, {
      user_id: user.id,
      idempotency_key: input.idempotency_key,
    });
    if (existing) {
      ensure(
        existing.type === 'wallet_topup' && existing.amount === input.amount,
        'Idempotency key was already used for another payment',
        'conflict',
      );
      return existing;
    }
    return manager.save(EntitySchemas.transactions, {
      user_id: user.id,
      transaction_code: `wallet_topup:${wallet.id}:${input.idempotency_key}`,
      type: 'wallet_topup',
      reference_id: wallet.id,
      amount: input.amount,
      direction: 'in',
      idempotency_key: input.idempotency_key,
      payment_gateway: this.gateway.activeProvider,
      status: 'pending',
      checkout_expires_at: Payment.checkoutExpiresAt(),
    });
  }

  /**
   * Create a wallet withdrawal request after checking the balance, payout details, and withdrawal limit.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `presentWithdrawalRequest`.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async requestWithdrawal(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentWithdrawalCommandInput,
  ) {
    role(actor, 'customer', 'photographer');
    const user = await currentUser(manager, actor);
    Wallet.assertWithdrawalAmount(input.amount);
    const wallet = await this.lockWallet(manager, user.id);
    const existing = await manager.findOneBy(EntitySchemas.refund_requests, {
      user_id: user.id,
      idempotency_key: input.idempotency_key,
    });
    if (existing) {
      ensure(
        existing.request_type === RefundRequestType.WALLET_WITHDRAWAL &&
          Number(existing.amount) === input.amount &&
          existing.reason === input.reason,
        'Idempotency key was already used for another request',
        'conflict',
      );
      if (input.payout_destination) {
        const existingDestination = decryptPayoutDestination(
          existing.payout_destination_encrypted,
        );
        ensure(
          existingDestination?.bank_code ===
            input.payout_destination.bank_code &&
            existingDestination?.account_number ===
              input.payout_destination.account_number &&
            existingDestination?.account_name ===
              input.payout_destination.account_name,
          'Idempotency key was already used with another payout destination',
          'conflict',
        );
      }
      return this.presentWithdrawalRequest(existing);
    }
    let savedDestination = await manager.findOneBy(
      EntitySchemas.wallet_payout_destinations,
      { user_id: user.id },
    );
    if (!savedDestination && input.payout_destination) {
      savedDestination = await manager.save(
        EntitySchemas.wallet_payout_destinations,
        {
          user_id: user.id,
          payout_destination_encrypted: encryptPayoutDestination(
            input.payout_destination,
          ),
        },
      );
    }
    ensure(
      savedDestination,
      'Register a payout destination before requesting a withdrawal',
      'conflict',
    );
    if (input.payout_destination) {
      const savedDetails = decryptPayoutDestination(
        savedDestination.payout_destination_encrypted,
      );
      ensure(
        savedDetails?.bank_code === input.payout_destination.bank_code &&
          savedDetails?.account_number ===
            input.payout_destination.account_number &&
          savedDetails?.account_name === input.payout_destination.account_name,
        'Update the saved payout destination before requesting a withdrawal',
        'conflict',
      );
    }
    const request = await manager.save(EntitySchemas.refund_requests, {
      request_type: RefundRequestType.WALLET_WITHDRAWAL,
      transaction_id: null,
      booking_id: null,
      wallet_id: wallet.id,
      user_id: user.id,
      requested_by: user.id,
      amount: input.amount,
      reserved_amount: 0,
      reason: input.reason,
      // Snapshot the destination so later profile edits cannot redirect this request.
      payout_destination_encrypted:
        savedDestination.payout_destination_encrypted,
      idempotency_key: input.idempotency_key,
      status: RefundStatus.REQUESTED,
      processing_due_at: Payment.requestProcessingDueAt(),
      sla_reminded_at: null,
      sla_escalated_at: null,
    });
    await this.createWithdrawalRequest(
      manager,
      user.id,
      request.id,
      input.amount,
    );
    await emit(manager, 'payment.withdrawal_requested', [user.id], {
      request_id: request.id,
      amount: input.amount,
    });
    return this.presentWithdrawalRequest(request);
  }

  /**
   * Get wallet payment details by ID after checking access permissions.
   *
   * @param s EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @returns Wallet information.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async get(s: EntityManager, userId: string) {
    const [wallet] = await s.findBy(EntitySchemas.wallets, { user_id: userId });
    ensure(wallet, 'Wallet not found', 'missing');
    return wallet;
  }

  /**
   * Get a wallet ledger using the user, page limit, and offset.
   *
   * @param s EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @param limit Maximum number of records to return.
   * @param offset Number of records to skip for pagination.
   * @returns Paginated ledger entries with related transaction and booking details.
   */
  async ledger(s: EntityManager, userId: string, limit = 50, offset = 0) {
    const wallet = await this.get(s, userId);
    const [items, total] = await s.findAndCount(EntitySchemas.wallet_ledger, {
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });

    const transactionIds = [
      ...new Set(
        items
          .map(({ transaction_id }) => transaction_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    const transactions = transactionIds.length
      ? await s.findBy(EntitySchemas.transactions, { id: In(transactionIds) })
      : [];
    const transactionsById = new Map(
      transactions.map((transaction) => [transaction.id, transaction]),
    );
    const bookingIds = [
      ...new Set(
        transactions
          .filter(
            (transaction) =>
              transaction.type === 'deposit' ||
              transaction.type === 'remaining',
          )
          .map(({ reference_id }) => reference_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    const bookings = bookingIds.length
      ? await s.findBy(EntitySchemas.bookings, { id: In(bookingIds) })
      : [];
    const bookingsById = new Map(
      bookings.map((booking) => [booking.id, booking]),
    );

    return {
      items: items.map((item) => {
        const transaction = item.transaction_id
          ? transactionsById.get(item.transaction_id)
          : undefined;
        const bookingId =
          transaction?.type === 'deposit' || transaction?.type === 'remaining'
            ? transaction.reference_id
            : null;
        const booking = bookingId ? bookingsById.get(bookingId) : undefined;

        return {
          ...item,
          transaction: transaction
            ? {
                id: transaction.id,
                transaction_code: transaction.transaction_code,
                type: transaction.type,
                direction: transaction.direction,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                payment_gateway: transaction.payment_gateway,
                description: transaction.description,
              }
            : null,
          booking: booking
            ? {
                id: booking.id,
                status: booking.status,
                from: booking.from,
                to: booking.to,
                package_name: booking.package_snapshot?.name ?? null,
              }
            : null,
        };
      }),
      total,
      limit,
      offset,
    };
  }

  /**
   * Credit a wallet from a confirmed deposit transaction.
   *
   * @param s EntityManager for the current transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @returns No value is returned.
   */
  async creditTopUp(s: EntityManager, transaction: TransactionEntity) {
    const wallet = await this.lockWallet(s, transaction.user_id);
    await this.post(s, wallet, {
      entry_type: 'topup',
      available_delta: Number(transaction.amount),
      frozen_delta: 0,
      transaction_id: transaction.id,
      refund_request_id: null,
      idempotency_key: `wallet-topup:${transaction.id}`,
      description: 'Wallet top-up confirmed by payment provider',
    });
  }

  /**
   * Debit the customer wallet and record the booking payment.
   *
   * @param s EntityManager for the current transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param customerUserId Customer user ID.
   * @param photographerUserId Photographer user ID.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async payBooking(
    s: EntityManager,
    transaction: TransactionEntity,
    customerUserId: string,
    photographerUserId: string,
  ) {
    const walletUsers = await this.lockWallets(s, [
      customerUserId,
      photographerUserId,
    ]);
    const customer = walletUsers.get(customerUserId)!;
    const photographer = walletUsers.get(photographerUserId)!;
    const amount = Number(transaction.amount);
    Wallet.assertAvailableBalance(
      customer.balance,
      amount,
      'Insufficient wallet balance',
    );
    await this.post(s, customer, {
      entry_type: 'booking_payment',
      available_delta: -amount,
      frozen_delta: 0,
      transaction_id: transaction.id,
      refund_request_id: null,
      idempotency_key: `wallet-booking-debit:${transaction.id}`,
      description: 'Booking payment from wallet',
    });
    await this.post(s, photographer, {
      entry_type: 'booking_escrow_hold',
      available_delta: 0,
      frozen_delta: amount,
      transaction_id: transaction.id,
      refund_request_id: null,
      idempotency_key: `booking-escrow-hold:${transaction.id}`,
      description: 'Booking funds held until booking completion',
    });
  }

  /**
   * Credit the photographer’s held balance with the booking funds.
   *
   * @param s EntityManager for the current transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param photographerUserId Photographer user ID.
   * @returns No value is returned.
   */
  async holdBookingPayment(
    s: EntityManager,
    transaction: TransactionEntity,
    photographerUserId: string,
  ) {
    const wallet = await this.lockWallet(s, photographerUserId);
    await this.post(s, wallet, {
      entry_type: 'booking_escrow_hold',
      available_delta: 0,
      frozen_delta: Number(transaction.amount),
      transaction_id: transaction.id,
      refund_request_id: null,
      idempotency_key: `booking-escrow-hold:${transaction.id}`,
      description: 'Booking funds held until booking completion',
    });
  }

  /**
   * Release the held booking payment using the idempotency key.
   *
   * @param s EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param settlementKey Settlement idempotency key.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async releaseBookingEscrow(
    s: EntityManager,
    bookingId: string,
    settlementKey: string,
  ) {
    const scheduledSettlement = await s.findOneBy(
      EntitySchemas.payment_escrow_settlements,
      { booking_id: bookingId },
    );
    if (
      scheduledSettlement &&
      !scheduledSettlement.release_processed_at &&
      Date.parse(scheduledSettlement.release_at) > Date.now()
    )
      return;
    const [booking] = await s.findBy(EntitySchemas.bookings, { id: bookingId });
    ensure(booking, 'Booking not found', 'missing');
    const [photographer] = await s.findBy(EntitySchemas.photographers, {
      id: booking.photographer_id,
    });
    ensure(photographer, 'Photographer not found', 'missing');
    const wallet = await this.lockWallet(s, photographer.user_id);
    const transactions = await s.findBy(EntitySchemas.transactions, {
      reference_id: bookingId,
      status: 'paid',
      type: In(['deposit', 'remaining']),
    });
    for (const transaction of transactions) {
      const [{ frozen = 0 } = {}] = await s
        .createQueryBuilder(EntitySchemas.wallet_ledger, 'ledger')
        .select('COALESCE(SUM(ledger.frozen_delta), 0)', 'frozen')
        .where('ledger.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('ledger.transaction_id = :transactionId', {
          transactionId: transaction.id,
        })
        .getRawMany<{ frozen: string | number }>();
      const [{ reserved = 0 } = {}] = await s
        .createQueryBuilder(
          EntitySchemas.refund_request_allocations,
          'allocation',
        )
        .innerJoin(
          EntitySchemas.refund_requests,
          'request',
          'request.id = allocation.refund_request_id',
        )
        .select('COALESCE(SUM(allocation.amount), 0)', 'reserved')
        .where('allocation.transaction_id = :transactionId', {
          transactionId: transaction.id,
        })
        .andWhere('request.status IN (:...statuses)', {
          statuses: ['requested', 'approved'],
        })
        .getRawMany<{ reserved: string | number }>();
      const releasable = Math.max(0, Number(frozen) - Number(reserved));
      if (!releasable) continue;
      await this.post(s, wallet, {
        entry_type: 'booking_escrow_release',
        available_delta: releasable,
        frozen_delta: -releasable,
        transaction_id: transaction.id,
        refund_request_id: null,
        idempotency_key: `booking-escrow-release:${settlementKey}:${transaction.id}`,
        description: `Booking funds released during ${settlementKey}`,
      });
    }
  }

  /**
   * Reserve the amount to be refunded to prevent it from being spent twice.
   *
   * @param s EntityManager for the current transaction.
   * @param requestId Request ID to process.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param photographerUserId Photographer user ID.
   * @param amount Transaction amount in the system’s currency.
   * @returns Processed unfunded value.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async reserveRefund(
    s: EntityManager,
    requestId: string,
    transaction: TransactionEntity,
    photographerUserId: string,
    amount: number,
  ) {
    const wallet = await this.lockWallet(s, photographerUserId);
    const [{ frozen = 0 } = {}] = await s
      .createQueryBuilder(EntitySchemas.wallet_ledger, 'ledger')
      .select('COALESCE(SUM(ledger.frozen_delta), 0)', 'frozen')
      .where('ledger.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('ledger.transaction_id = :transactionId', {
        transactionId: transaction.id,
      })
      .getRawMany<{ frozen: string | number }>();
    const [{ approved = 0 } = {}] = await s
      .createQueryBuilder(
        EntitySchemas.refund_request_allocations,
        'allocation',
      )
      .innerJoin(
        EntitySchemas.refund_requests,
        'request',
        'request.id = allocation.refund_request_id',
      )
      .select('COALESCE(SUM(allocation.amount), 0)', 'approved')
      .where('allocation.transaction_id = :transactionId', {
        transactionId: transaction.id,
      })
      .andWhere('request.status = :status', { status: 'approved' })
      .andWhere('request.id <> :requestId', { requestId })
      .getRawMany<{ approved: string | number }>();
    const unfunded = Math.max(
      0,
      amount - Math.max(0, Number(frozen) - Number(approved)),
    );
    Wallet.assertAvailableBalance(
      wallet.balance,
      unfunded,
      'Photographer wallet cannot cover refund',
    );
    if (unfunded)
      await this.post(s, wallet, {
        entry_type: 'refund_reserve',
        available_delta: -unfunded,
        frozen_delta: unfunded,
        transaction_id: transaction.id,
        refund_request_id: requestId,
        idempotency_key: `refund-reserve:${requestId}:${transaction.id}`,
        description: 'Funds reserved for an approved booking refund',
      });
    return unfunded;
  }

  /**
   * Mark a refund request as processed and update the related transaction.
   *
   * @param s EntityManager for the current transaction.
   * @param requestId Request ID to process.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @param customerUserId Customer user ID.
   * @param photographerUserId Photographer user ID.
   * @param amount Transaction amount in the system’s currency.
   * @param creditCustomerWallet Whether to credit the customer wallet.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async completeRefund(
    s: EntityManager,
    requestId: string,
    transaction: TransactionEntity,
    customerUserId: string,
    photographerUserId: string,
    amount: number,
    creditCustomerWallet: boolean,
  ) {
    const users = await this.lockWallets(s, [
      photographerUserId,
      ...(creditCustomerWallet ? [customerUserId] : []),
    ]);
    const photographer = users.get(photographerUserId)!;
    Wallet.assertFrozenBalance(
      photographer.frozen_balance,
      amount,
      'Reserved refund balance is insufficient',
    );
    if (creditCustomerWallet) {
      const customer = users.get(customerUserId)!;
      await this.post(s, customer, {
        entry_type: 'refund_credit',
        available_delta: amount,
        frozen_delta: 0,
        transaction_id: transaction.id,
        refund_request_id: requestId,
        idempotency_key: `refund-credit:${requestId}:${transaction.id}`,
        description: 'Approved booking refund credited to wallet',
      });
    }
    await this.post(s, photographer, {
      entry_type: 'refund_debit',
      available_delta: 0,
      frozen_delta: -amount,
      transaction_id: transaction.id,
      refund_request_id: requestId,
      idempotency_key: `refund-debit:${requestId}:${transaction.id}`,
      description: 'Approved refund paid from booking escrow',
    });
  }

  /**
   * Create a withdrawal request and reserve the amount to be paid out.
   *
   * @param s EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @param requestId Request ID to process.
   * @param amount Transaction amount in the system’s currency.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async createWithdrawalRequest(
    s: EntityManager,
    userId: string,
    requestId: string,
    amount: number,
  ) {
    const wallet = await this.lockWallet(s, userId);
    Wallet.assertAvailableBalance(
      wallet.balance,
      amount,
      'Insufficient wallet balance',
    );
    await this.post(s, wallet, {
      entry_type: 'withdrawal_reserve',
      available_delta: -amount,
      frozen_delta: amount,
      transaction_id: null,
      refund_request_id: requestId,
      idempotency_key: `withdrawal-reserve:${requestId}`,
      description: 'Funds reserved for a withdrawal request',
    });
  }

  /** Ensure a withdrawal request still owns its exact reserved frozen amount. */
  async assertWithdrawalReservation(
    s: EntityManager,
    requestId: string,
    userId: string,
    walletId: string,
    amount: number,
  ) {
    const wallet = await this.lockWallet(s, userId);
    ensure(
      wallet.id === walletId,
      'Withdrawal wallet does not match the request',
      'conflict',
    );
    return this.assertWithdrawalReservationInWallet(
      s,
      wallet,
      requestId,
      amount,
    );
  }

  private async assertWithdrawalReservationInWallet(
    s: EntityManager,
    wallet: WalletEntity,
    requestId: string,
    amount: number,
  ) {
    Wallet.assertFrozenBalance(
      wallet.frozen_balance,
      amount,
      'Reserved withdrawal balance is missing',
    );
    const [{ reserved = 0 } = {}] = await s
      .createQueryBuilder(EntitySchemas.wallet_ledger, 'ledger')
      .select('COALESCE(SUM(ledger.frozen_delta), 0)', 'reserved')
      .where('ledger.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('ledger.refund_request_id = :requestId', { requestId })
      .andWhere('ledger.entry_type IN (:...entryTypes)', {
        entryTypes: [
          'withdrawal_reserve',
          'withdrawal_release',
          'withdrawal_paid',
        ],
      })
      .getRawMany<{ reserved: string | number }>();
    ensure(
      Number(reserved) === amount,
      'Reserved balance for this withdrawal request is missing',
      'conflict',
    );
    return wallet;
  }

  /**
   * Reject a withdrawal request and release its reserved balance.
   *
   * @param s EntityManager for the current transaction.
   * @param requestId Request ID to process.
   * @param userId User ID associated with the operation.
   * @param amount Transaction amount in the system’s currency.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async rejectWithdrawal(
    s: EntityManager,
    requestId: string,
    userId: string,
    amount: number,
  ) {
    const wallet = await this.lockWallet(s, userId);
    await this.assertWithdrawalReservationInWallet(
      s,
      wallet,
      requestId,
      amount,
    );
    await this.post(s, wallet, {
      entry_type: 'withdrawal_release',
      available_delta: amount,
      frozen_delta: -amount,
      transaction_id: null,
      refund_request_id: requestId,
      idempotency_key: `withdrawal-release:${requestId}`,
      description: 'Rejected withdrawal returned to available balance',
    });
  }

  /**
   * Complete a withdrawal request and record the payout transaction.
   *
   * @param s EntityManager for the current transaction.
   * @param requestId Request ID to process.
   * @param userId User ID associated with the operation.
   * @param amount Transaction amount in the system’s currency.
   * @param transactionId Transaction ID to process.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async completeWithdrawal(
    s: EntityManager,
    requestId: string,
    userId: string,
    amount: number,
    transactionId: string,
  ) {
    const wallet = await this.lockWallet(s, userId);
    await this.assertWithdrawalReservationInWallet(
      s,
      wallet,
      requestId,
      amount,
    );
    await this.post(s, wallet, {
      entry_type: 'withdrawal_paid',
      available_delta: 0,
      frozen_delta: -amount,
      transaction_id: transactionId,
      refund_request_id: requestId,
      idempotency_key: `withdrawal-paid:${requestId}`,
      description: 'Withdrawal completed after payout confirmation',
    });
  }

  /**
   * Lock the user wallet before recording balance changes.
   *
   * @param s EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @returns Wallet information.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  private async lockWallet(s: EntityManager, userId: string) {
    const wallet = await s.findOne(EntitySchemas.wallets, {
      where: { user_id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(wallet, 'Wallet not found', 'missing');
    return wallet;
  }

  /**
   * Lock wallets in a stable order to avoid deadlocks when updating multiple wallets.
   *
   * @param s EntityManager for the current transaction.
   * @param userIds List of user IDs to process.
   * @returns Processing result.
   */
  private async lockWallets(s: EntityManager, userIds: string[]) {
    const result = new Map<
      string,
      Awaited<ReturnType<WalletUseCases['lockWallet']>>
    >();
    for (const userId of [...new Set(userIds)].sort())
      result.set(userId, await this.lockWallet(s, userId));
    return result;
  }

  /**
   * Write the ledger entry and update the wallet balance in the same transaction.
   *
   * @param s EntityManager for the current transaction.
   * @param wallet Wallet.
   * @param entry Value used by the operation: entry.
   * @returns Result of the operation described above.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  private async post(
    s: EntityManager,
    wallet: Awaited<ReturnType<WalletUseCases['lockWallet']>>,
    entry: {
      entry_type: string;
      available_delta: number;
      frozen_delta: number;
      transaction_id: string | null;
      refund_request_id: string | null;
      idempotency_key: string;
      description: string;
    },
  ) {
    const previous = await s.findOneBy(EntitySchemas.wallet_ledger, {
      idempotency_key: entry.idempotency_key,
    });
    if (previous) return wallet;
    const balance = Number(wallet.balance) + entry.available_delta;
    const frozenBalance = Number(wallet.frozen_balance) + entry.frozen_delta;
    Wallet.assertNonNegativeBalances(balance, frozenBalance);
    const updated = await updateEntity(s, EntitySchemas.wallets, wallet.id, {
      balance,
      frozen_balance: frozenBalance,
    });
    await s.save(EntitySchemas.wallet_ledger, {
      wallet_id: wallet.id,
      ...entry,
    });
    Object.assign(wallet, updated);
    return wallet;
  }

  /**
   * Remove encrypted bank details before returning a withdrawal request.
   *
   * @param request Withdrawal request to present to the caller.
   * @returns Request data with decrypted payout details.
   */
  private presentWithdrawalRequest(request: RefundRequestEntity) {
    const { payout_destination_encrypted, ...publicRequest } = request;
    return {
      ...publicRequest,
      payout_destination: decryptPayoutDestination(
        payout_destination_encrypted,
      ),
    };
  }

  /** Remove the full account number from the saved destination response. */
  private presentPayoutDestination(
    destination: WalletPayoutDestinationEntity | null,
  ) {
    if (!destination)
      return {
        is_configured: false,
        bank_code: null,
        account_name: null,
        account_number_masked: null,
        updated_at: null,
      };
    const payoutDestination = decryptPayoutDestination(
      destination.payout_destination_encrypted,
    );
    ensure(payoutDestination, 'Saved payout destination is missing');
    return {
      is_configured: true,
      bank_code: payoutDestination.bank_code,
      account_name: payoutDestination.account_name,
      account_number_masked: `••••${payoutDestination.account_number.slice(-4)}`,
      updated_at: destination.updated_at,
    };
  }
}
