import {
  IsNull,
  LessThanOrEqual,
  type DataSource,
  type EntityManager,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  EntitySchemas,
  updateEntity,
  type BookingEntity,
  type TransactionEntity,
} from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentGateway } from '@shared/integrations/payment/port/payment.port';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  required,
  emit,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  ExternalPaymentProvider,
  RefundRequestType,
  TransactionPaymentGateway,
} from '@shared/domain/values/payment.values';
import { Payment } from './payment.domain';
import { SubscriptionHistoryEvent } from '@shared/domain/values/subscription.values';
import { WalletUseCases } from './wallet/wallet.use-case';
import { RefundUseCases } from './refund/refund.use-case';
import type { SubscriptionPaymentsPort } from '@modules/subscription/ports/subscription-payments.port';
import { Subscription } from '@modules/subscription/subscription.domain';
import type { BookingPaymentSettlementPort } from '@modules/booking/ports/booking-payment-settlement.port';

type PaymentInput =
  Inputs.PaymentDepositCommandInput | Inputs.PaymentRemainingCommandInput;

const CHECKOUT_RECONCILIATION_BACKOFF_MS = [
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;
const CHECKOUT_RECONCILIATION_MAX_ATTEMPTS =
  CHECKOUT_RECONCILIATION_BACKOFF_MS.length + 1;

@Injectable()
export class PaymentUseCases
  implements SubscriptionPaymentsPort, BookingPaymentSettlementPort
{
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly wallets: WalletUseCases,
    private readonly refunds: RefundUseCases,
  ) {}

  /**
   * Create or reuse one deposit/remaining intent after locking the booking.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @param type Type of object or operation.
   * @returns Result of the operation described above.
   * @throws {DomainError} Thrown when required data or a resource is missing, or the current state or data conflicts with the operation.
   */
  async intent(
    manager: EntityManager,
    actor: Actor,
    input: PaymentInput,
    type: 'deposit' | 'remaining',
  ) {
    const { booking: accessibleBooking, user } = await bookingAccess(
      manager,
      actor,
      input.id,
      'customer',
    );
    const booking = await manager.findOne(EntitySchemas.bookings, {
      where: { id: accessibleBooking.id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'Booking not found', 'missing');
    ensure(
      ['accepted', 'in_progress', 'shot'].includes(booking.status),
      'Booking cannot be paid in this state',
      'conflict',
    );

    const payFromWallet = input.payment_method === 'wallet';
    const provider = payFromWallet
      ? TransactionPaymentGateway.WALLET_INTERNAL
      : this.gateway.activeProvider;
    const transactions = await manager.findBy(EntitySchemas.transactions, {
      reference_id: booking.id,
    });
    const existing = transactions.find(
      (transaction) => transaction.type === type,
    );
    if (type === 'deposit' && booking.status === 'accepted')
      Payment.assertDepositIntentOpen(booking.accepted_at, booking.from);
    const amount =
      type === 'deposit'
        ? Number(booking.deposit_amount)
        : Number(booking.total_amount) - Number(booking.deposit_amount);
    Payment.assertAmount(amount);

    if (existing) {
      ensure(
        existing.user_id === user.id,
        'Payment owner does not match booking',
        'conflict',
      );
      ensure(
        existing.amount === amount,
        'Booking amount changed after payment intent creation',
        'conflict',
      );
      ensure(
        existing.payment_gateway === provider,
        'Payment method cannot change after an intent was created',
        'conflict',
      );
      ensure(
        existing.status !== 'failed',
        'This payment attempt failed; contact support to retry',
        'conflict',
      );
      return existing;
    }
    if (type === 'remaining')
      ensure(
        transactions.some(
          (transaction) =>
            transaction.type === 'deposit' && transaction.status === 'paid',
        ),
        'Pay the deposit first',
        'conflict',
      );
    const checkoutExpiresAt =
      !payFromWallet && type === 'deposit'
        ? Payment.depositDeadlineAt(booking.accepted_at, booking.from)
        : null;

    const transaction = await manager.save(EntitySchemas.transactions, {
      user_id: user.id,
      transaction_code: `${type}:${booking.id}`,
      type,
      reference_id: booking.id,
      amount,
      direction: payFromWallet ? 'out' : 'in',
      idempotency_key: input.idempotency_key,
      payment_gateway: provider,
      provider_order_code: payFromWallet ? null : undefined,
      status: payFromWallet ? 'paid' : 'pending',
      checkout_expires_at: checkoutExpiresAt,
    });

    if (payFromWallet) {
      const photographer = await required(
        manager,
        'photographers',
        booking.photographer_id,
      );
      await this.wallets.payBooking(
        manager,
        transaction,
        user.id,
        photographer.user_id,
      );
      await this.emitBookingPayment(manager, booking.id, transaction);
    }
    return transaction;
  }

  /**
   * Settle a paid transaction and update the balance or related status.
   *
   * @param dataSource Data source used to open a transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @returns Result of the operation performed in the transaction.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async fulfill(dataSource: DataSource, transaction: TransactionEntity) {
    if (transaction.status === 'paid')
      return { ...transaction, checkout_url: null, qr_code: null };
    const checkoutExpired =
      transaction.checkout_expired_at !== null ||
      (transaction.checkout_expires_at !== null &&
        Date.parse(transaction.checkout_expires_at) <= Date.now());
    if (checkoutExpired)
      return { ...transaction, checkout_url: null, qr_code: null };
    if (transaction.checkout_url || transaction.qr_code) return transaction;
    ensure(
      transaction.payment_gateway === ExternalPaymentProvider.PAYOS ||
        transaction.payment_gateway === ExternalPaymentProvider.SEPAY,
      'This payment does not use an external provider',
      'conflict',
    );
    ensure(
      transaction.provider_order_code,
      'Payment order code is missing',
      'conflict',
    );
    const link = await this.gateway.create(
      Number(transaction.provider_order_code),
      Number(transaction.amount),
      transaction.payment_gateway,
      transaction.checkout_expires_at ?? undefined,
    );
    return dataSource.transaction(async (manager) => {
      const updated = await updateEntity(
        manager,
        EntitySchemas.transactions,
        transaction.id,
        link,
      );
      Object.assign(transaction, updated);
      return transaction;
    });
  }

  /**
   * Schedule a 72-hour escrow hold after a booking is marked completed.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param completedAt Time when the booking was completed.
   * @returns No value is returned.
   */
  async scheduleBookingEscrowRelease(
    manager: EntityManager,
    bookingId: string,
    completedAt: string,
  ) {
    const existing = await manager.findOneBy(
      EntitySchemas.payment_escrow_settlements,
      { booking_id: bookingId },
    );
    if (existing) return;
    await manager.save(EntitySchemas.payment_escrow_settlements, {
      booking_id: bookingId,
      release_at: Payment.escrowReleaseAt(completedAt),
      refund_request_deadline_at: Payment.escrowReleaseAt(completedAt),
      release_processed_at: null,
    });
  }

  /**
   * Extend a pending escrow payout hold while preserving the customer refund-request cutoff.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Administrator performing the extension.
   * @param bookingId Booking whose escrow release is being extended.
   * @param extensionHours Number of hours to add to the release deadline.
   * @param reason Required audit reason for the extension.
   * @param now Current time in milliseconds.
   * @returns Updated escrow settlement.
   * @throws {DomainError} Thrown when the actor is unauthorized, the settlement is missing/already processed, or the extension is invalid.
   */
  async extendBookingEscrowRelease(
    manager: EntityManager,
    actor: Actor,
    bookingId: string,
    extensionHours: number,
    reason: string,
    now = Date.now(),
  ) {
    role(actor, 'admin');
    ensure(reason.trim().length > 0, 'An extension reason is required');
    ensure(reason.length <= 1000, 'Extension reason is too long');
    const admin = await currentUser(manager, actor);
    const settlement = await manager.findOne(
      EntitySchemas.payment_escrow_settlements,
      {
        where: { booking_id: bookingId },
        lock: { mode: 'pessimistic_write' },
      },
    );
    ensure(settlement, 'Escrow settlement not found', 'missing');
    ensure(
      !settlement.release_processed_at,
      'Escrow has already been released and cannot be extended',
      'conflict',
    );
    const previousReleaseAt = settlement.release_at;
    const newReleaseAt = Payment.extendProcessingDeadline(
      previousReleaseAt,
      extensionHours,
      now,
    );
    const updated = await updateEntity(
      manager,
      EntitySchemas.payment_escrow_settlements,
      settlement.id,
      { release_at: newReleaseAt },
    );
    await manager.save(EntitySchemas.payment_escrow_extensions, {
      settlement_id: settlement.id,
      extended_by: admin.id,
      previous_release_at: previousReleaseAt,
      new_release_at: newReleaseAt,
      extension_hours: extensionHours,
      reason: reason.trim(),
    });
    const booking = await required(manager, 'bookings', bookingId);
    const photographer = await required(
      manager,
      'photographers',
      booking.photographer_id,
    );
    await emit(
      manager,
      'payment.escrow_release_extended',
      [photographer.user_id, admin.id],
      {
        booking_id: bookingId,
        previous_release_at: previousReleaseAt,
        release_at: newReleaseAt,
        extension_hours: extensionHours,
        reason: reason.trim(),
      },
    );
    return updated;
  }

  /**
   * Release due booking escrow while preserving amounts attached to open refund requests.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; must have the `system` role.
   * @param now Current time in milliseconds.
   * @returns Object containing the number of settlements processed.
   */
  async releaseDueBookingEscrow(
    manager: EntityManager,
    actor: Actor,
    now = Date.now(),
  ) {
    role(actor, 'system');
    const due = await manager.find(EntitySchemas.payment_escrow_settlements, {
      where: {
        release_at: LessThanOrEqual(new Date(now).toISOString()),
        release_processed_at: IsNull(),
      },
      order: { release_at: 'ASC', id: 'ASC' },
      take: 100,
      lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
    });
    for (const settlement of due) {
      await this.wallets.releaseBookingEscrow(
        manager,
        settlement.booking_id,
        `booking-completed:${settlement.booking_id}`,
      );
      await updateEntity(
        manager,
        EntitySchemas.payment_escrow_settlements,
        settlement.id,
        { release_processed_at: new Date(now).toISOString() },
      );
    }
    return { processed: due.length };
  }

  /**
   * Create a deposit payment request for a booking.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `intent`.
   */
  deposit(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentDepositCommandInput,
  ) {
    return this.intent(manager, actor, input, 'deposit');
  }

  /**
   * Create a payment request for the remaining booking balance.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `intent`.
   */
  remaining(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentRemainingCommandInput,
  ) {
    return this.intent(manager, actor, input, 'remaining');
  }

  /**
   * Validate and process a webhook from the provider.
   *
   * @param manager EntityManager for the current transaction.
   * @param _actor Actor passed through the interface; unused by this code path.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `received`, `duplicate`.
   * @throws {DomainError} Thrown when required data or a resource is missing, input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async webhook(
    manager: EntityManager,
    _actor: Actor,
    input: Inputs.PaymentWebhookCommandInput,
  ) {
    ensure(
      Object.values(ExternalPaymentProvider).includes(input.provider as never),
      'Unsupported payment provider',
      'invalid',
    );
    const provider =
      input.provider as (typeof ExternalPaymentProvider)[keyof typeof ExternalPaymentProvider];
    const verified = await this.gateway.verify(
      input.payload,
      provider,
      input.headers,
    );
    ensure(verified.success, 'Payment callback is not successful');
    return this.acceptVerifiedPayment(manager, provider, verified);
  }

  /** Apply a verified provider result from either a webhook or provider reconciliation. */
  private async acceptVerifiedPayment(
    manager: EntityManager,
    provider: (typeof ExternalPaymentProvider)[keyof typeof ExternalPaymentProvider],
    verified: {
      success: boolean;
      orderCode: number;
      amount: number;
      reference: string;
    },
  ) {
    const candidate = await manager.findOneBy(EntitySchemas.transactions, {
      provider_order_code: verified.orderCode,
    });
    ensure(candidate, 'Unknown payment order', 'missing');
    ensure(
      candidate.payment_gateway === provider,
      'Payment provider does not match the order',
      'conflict',
    );
    let booking: BookingEntity | null = null;
    if (['deposit', 'remaining'].includes(candidate.type)) {
      ensure(
        candidate.reference_id,
        'Booking reference is missing',
        'conflict',
      );
      booking = await manager.findOne(EntitySchemas.bookings, {
        where: { id: candidate.reference_id },
        lock: { mode: 'pessimistic_write' },
      });
      ensure(booking, 'Booking not found', 'missing');
    }
    const transaction = await this.lockTransaction(manager, candidate.id);
    ensure(
      transaction.payment_gateway === provider &&
        transaction.provider_order_code === verified.orderCode,
      'Payment order changed while processing webhook',
      'conflict',
    );
    new Payment(Number(transaction.amount), transaction.status).acceptCallback(
      verified.amount,
    );
    const existingWebhook = await manager.findOneBy(
      EntitySchemas.payment_webhooks,
      {
        provider,
        reference: verified.reference,
      },
    );
    if (existingWebhook) {
      ensure(
        existingWebhook.transaction_id === transaction.id,
        'Webhook reference collision',
        'conflict',
      );
      return { received: true, duplicate: true };
    }
    await manager.save(EntitySchemas.payment_webhooks, {
      provider,
      reference: verified.reference,
      transaction_id: transaction.id,
    });
    if (transaction.status === 'paid')
      return { received: true, duplicate: true };
    await updateEntity(manager, EntitySchemas.transactions, transaction.id, {
      status: 'paid',
      checkout_review_required_at: null,
      checkout_reconciliation_next_at: null,
      ...(transaction.checkout_review_resolution === 'unpaid'
        ? {
            checkout_review_resolution: null,
            checkout_review_resolved_by: null,
            checkout_review_resolved_at: null,
            checkout_review_resolution_reference: null,
            checkout_review_resolution_note: null,
          }
        : {}),
    });

    if (transaction.type === 'wallet_topup') {
      await this.wallets.creditTopUp(manager, transaction);
      await emit(manager, 'payment.wallet_topped_up', [transaction.user_id], {
        transaction_id: transaction.id,
        amount: Number(transaction.amount),
      });
      return { received: true, duplicate: false };
    }
    if (transaction.type === 'subscription') {
      ensure(
        transaction.reference_id,
        'Subscription reference is missing',
        'conflict',
      );
      const subscription = await manager.findOne(EntitySchemas.subscriptions, {
        where: { id: transaction.reference_id },
        lock: { mode: 'pessimistic_write' },
      });
      ensure(subscription, 'Subscription not found', 'missing');
      if (subscription.status !== 'pending') {
        const now = new Date().toISOString();
        await updateEntity(
          manager,
          EntitySchemas.transactions,
          transaction.id,
          {
            checkout_review_required_at: now,
          },
        );
        await manager.save(EntitySchemas.subscription_status_history, {
          subscription_id: subscription.id,
          event_type: SubscriptionHistoryEvent.PAYMENT_LATE_REVIEW,
          from_status: subscription.status,
          to_status: subscription.status,
          actor_user_id: null,
          actor_role: 'system',
          transaction_id: transaction.id,
          note: 'Verified payment arrived after the subscription checkout had closed; manual review is required.',
        });
        const admins = await manager.findBy(EntitySchemas.admins, {
          is_active: true,
        });
        await emit(
          manager,
          'subscription.payment_late_review',
          [transaction.user_id, ...admins.map((admin) => admin.user_id)],
          {
            subscription_id: subscription.id,
            transaction_id: transaction.id,
            amount: Number(transaction.amount),
          },
        );
        return { received: true, duplicate: false };
      }
      const periodLengthMs =
        Date.parse(subscription.end_at) - Date.parse(subscription.start_at);
      const billingCycleDays =
        subscription.plan_snapshot?.billing_cycle ?? periodLengthMs / 864e5;
      ensure(
        Number.isSafeInteger(billingCycleDays) && billingCycleDays > 0,
        'Subscription billing period is invalid',
        'conflict',
      );
      const activePeriod = Subscription.period(
        new Date().toISOString(),
        billingCycleDays,
      );
      await updateEntity(
        manager,
        EntitySchemas.subscriptions,
        subscription.id,
        { ...activePeriod, status: 'active' },
      );
      await manager.save(EntitySchemas.subscription_status_history, {
        subscription_id: subscription.id,
        event_type: SubscriptionHistoryEvent.PAYMENT_ACTIVATED,
        from_status: 'pending',
        to_status: 'active',
        actor_user_id: null,
        actor_role: 'system',
        transaction_id: transaction.id,
        note: 'Activated after provider payment verification.',
      });
      await emit(manager, 'payment.subscription', [transaction.user_id], {
        subscription_id: subscription.id,
        transaction_id: transaction.id,
      });
      return { received: true, duplicate: false };
    }

    ensure(
      ['deposit', 'remaining'].includes(transaction.type) &&
        transaction.reference_id,
      'Unsupported transaction type for provider payment',
      'conflict',
    );
    ensure(booking, 'Booking not found', 'missing');
    const photographer = await required(
      manager,
      'photographers',
      booking.photographer_id,
    );
    await this.wallets.holdBookingPayment(
      manager,
      transaction,
      photographer.user_id,
    );
    await this.emitBookingPayment(manager, booking.id, transaction);
    if (['cancelled', 'rejected', 'expired'].includes(booking.status))
      await this.refunds.requestCancellationRefunds(
        manager,
        booking.id,
        null,
        'Payment arrived after booking ended; refund requires review',
      );
    return { received: true, duplicate: false };
  }

  /**
   * Expire due checkouts, reconcile provider orders, and flag uncertain payment outcomes for review.
   *
   * @param dataSource Data source used to read candidates and process each transaction.
   * @param actor Actor performing the scheduled operation; must have the `system` role.
   * @param now Current time in milliseconds.
   * @returns Object containing the number of checkout records processed.
   * @throws {DomainError} Thrown when the actor is unauthorized or a verified payment conflicts with its transaction.
   */
  async expireDuePaymentCheckouts(
    dataSource: DataSource,
    actor: Actor,
    now = Date.now(),
  ) {
    role(actor, 'system');
    const nowIso = new Date(now).toISOString();
    const candidates = await dataSource.manager
      .createQueryBuilder(EntitySchemas.transactions, 'transaction')
      .leftJoin(
        EntitySchemas.bookings,
        'booking',
        'booking.id = transaction.reference_id',
      )
      .where('transaction.status = :status', { status: 'pending' })
      .andWhere(
        `((transaction.checkout_expired_at IS NULL
            AND ((transaction.checkout_expires_at IS NOT NULL AND transaction.checkout_expires_at <= :now)
              OR (transaction.type IN (:...bookingTypes) AND booking.status IN (:...terminalStatuses))))
          OR (transaction.checkout_review_required_at IS NOT NULL
            AND transaction.checkout_reconciliation_next_at <= :now))`,
        {
          now: nowIso,
          bookingTypes: ['deposit', 'remaining'],
          terminalStatuses: ['cancelled', 'rejected', 'expired', 'completed'],
        },
      )
      .orderBy('transaction.created_at', 'ASC')
      .addOrderBy('transaction.id', 'ASC')
      .take(100)
      .getMany();

    let processed = 0;
    for (const candidate of candidates) {
      let providerState: Awaited<ReturnType<PaymentGateway['inspect']>> = null;
      if (
        candidate.provider_order_code !== null &&
        (candidate.payment_gateway === ExternalPaymentProvider.PAYOS ||
          candidate.payment_gateway === ExternalPaymentProvider.SEPAY)
      ) {
        try {
          providerState = await this.gateway.inspect(
            Number(candidate.provider_order_code),
            candidate.payment_gateway,
          );
          if (providerState?.status === 'pending')
            providerState = await this.gateway.cancel(
              Number(candidate.provider_order_code),
              'Lens checkout deadline elapsed',
              candidate.payment_gateway,
            );
        } catch {
          // The local checkout still expires; the review marker keeps provider uncertainty visible to admins.
          providerState = null;
        }
      }

      await dataSource.transaction(async (manager) => {
        const snapshot = await manager.findOneBy(EntitySchemas.transactions, {
          id: candidate.id,
        });
        if (!snapshot || snapshot.status !== 'pending') return;
        const isReconciliationRetry =
          snapshot.checkout_review_required_at !== null;
        if (isReconciliationRetry) {
          if (
            !snapshot.checkout_reconciliation_next_at ||
            Date.parse(snapshot.checkout_reconciliation_next_at) > now
          )
            return;
        } else if (snapshot.checkout_expired_at) return;

        // Provider callbacks lock booking before transaction; preserve that order to avoid deadlocks.
        if (
          ['deposit', 'remaining'].includes(snapshot.type) &&
          snapshot.reference_id
        )
          await manager.findOne(EntitySchemas.bookings, {
            where: { id: snapshot.reference_id },
            lock: { mode: 'pessimistic_write' },
          });

        const transaction = await manager.findOne(EntitySchemas.transactions, {
          where: { id: candidate.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!transaction || transaction.status !== 'pending') return;
        const retryingReview = transaction.checkout_review_required_at !== null;
        if (retryingReview) {
          if (
            !transaction.checkout_reconciliation_next_at ||
            Date.parse(transaction.checkout_reconciliation_next_at) > now
          )
            return;
        } else if (transaction.checkout_expired_at) return;

        if (
          providerState?.status === 'paid' &&
          providerState.amount_paid === Number(transaction.amount) &&
          transaction.provider_order_code !== null
        ) {
          await this.acceptVerifiedPayment(
            manager,
            transaction.payment_gateway as (typeof ExternalPaymentProvider)[keyof typeof ExternalPaymentProvider],
            {
              success: true,
              orderCode: Number(transaction.provider_order_code),
              amount: providerState.amount_paid,
              reference:
                providerState.reference ??
                `payment-reconciliation:${transaction.provider_order_code}`,
            },
          );
          processed++;
          return;
        }

        const providerConfirmedUnpaid =
          providerState !== null &&
          ['expired', 'cancelled', 'failed'].includes(providerState.status) &&
          providerState.amount_paid === 0;
        const wasAlreadyExpired = transaction.checkout_expired_at !== null;
        const firstReviewAttempt =
          transaction.checkout_review_required_at === null;
        const attemptCount = transaction.checkout_reconciliation_attempts + 1;
        const canRetryProviderInspection =
          transaction.provider_order_code !== null &&
          (transaction.payment_gateway === ExternalPaymentProvider.PAYOS ||
            transaction.payment_gateway === ExternalPaymentProvider.SEPAY);
        const retryDelay =
          attemptCount <= CHECKOUT_RECONCILIATION_BACKOFF_MS.length
            ? CHECKOUT_RECONCILIATION_BACKOFF_MS[attemptCount - 1]
            : null;
        const update: Partial<TransactionEntity> = {
          checkout_expired_at: transaction.checkout_expired_at ?? nowIso,
          checkout_review_required_at: providerConfirmedUnpaid
            ? null
            : (transaction.checkout_review_required_at ?? nowIso),
          checkout_reconciliation_attempts: attemptCount,
          checkout_reconciliation_next_at:
            providerConfirmedUnpaid ||
            !canRetryProviderInspection ||
            attemptCount >= CHECKOUT_RECONCILIATION_MAX_ATTEMPTS ||
            retryDelay === null
              ? null
              : new Date(now + retryDelay).toISOString(),
          checkout_url: null,
          qr_code: null,
          ...(providerConfirmedUnpaid ? { status: 'failed' } : {}),
        };
        await updateEntity(
          manager,
          EntitySchemas.transactions,
          transaction.id,
          update,
        );
        if (
          providerConfirmedUnpaid &&
          transaction.type === 'subscription' &&
          transaction.reference_id
        ) {
          const subscription = await manager.findOne(
            EntitySchemas.subscriptions,
            {
              where: { id: transaction.reference_id },
              lock: { mode: 'pessimistic_write' },
            },
          );
          if (subscription?.status === 'pending') {
            await updateEntity(
              manager,
              EntitySchemas.subscriptions,
              subscription.id,
              {
                status: 'cancelled',
                auto_renew: false,
                cancel_at_period_end: false,
              },
            );
            await manager.save(EntitySchemas.subscription_status_history, {
              subscription_id: subscription.id,
              event_type: SubscriptionHistoryEvent.PAYMENT_TIMEOUT,
              from_status: 'pending',
              to_status: 'cancelled',
              actor_user_id: null,
              actor_role: 'system',
              transaction_id: transaction.id,
              note: 'Provider confirmed that the checkout expired without payment.',
            });
          }
        }
        if (!wasAlreadyExpired)
          await emit(
            manager,
            'payment.checkout_expired',
            [transaction.user_id],
            {
              transaction_id: transaction.id,
              transaction_type: transaction.type,
              review_required: !providerConfirmedUnpaid,
            },
          );
        if (providerConfirmedUnpaid && wasAlreadyExpired)
          await emit(
            manager,
            'payment.checkout_reconciled_unpaid',
            [transaction.user_id],
            { transaction_id: transaction.id },
          );
        if (!providerConfirmedUnpaid && firstReviewAttempt) {
          const admins = await manager.findBy(EntitySchemas.admins, {
            is_active: true,
          });
          if (admins.length)
            await emit(
              manager,
              'payment.checkout_reconciliation_required',
              admins.map((admin) => admin.user_id),
              {
                transaction_id: transaction.id,
                transaction_type: transaction.type,
                payment_gateway: transaction.payment_gateway,
                provider_order_code: transaction.provider_order_code,
              },
            );
        }
        processed++;
      });
    }
    return { processed };
  }

  /** Record the payment side of a subscription checkout review decision. */
  async resolveSubscriptionReview(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.SubscriptionPaymentReviewResolutionInput,
  ) {
    role(actor, 'admin');
    const admin = await currentUser(manager, actor);
    const candidate = await manager.findOneBy(EntitySchemas.transactions, {
      id: input.id,
    });
    ensure(candidate, 'Transaction not found', 'missing');
    ensure(
      candidate.type === 'subscription' && candidate.reference_id,
      'Only subscription checkouts can be reconciled here',
      'conflict',
    );
    const resolution =
      input.outcome === 'activate'
        ? 'paid_activated'
        : input.outcome === 'refund'
          ? 'paid_refund'
          : 'unpaid';
    const providerReference = input.provider_reference?.trim() ?? null;
    ensure(
      ['activate', 'refund', 'unpaid'].includes(input.outcome),
      'Unsupported subscription payment review outcome',
      'conflict',
    );
    let rejectedPriorRefundCanBeReconciled = false;
    if (candidate.checkout_review_resolution) {
      const priorRefund = await manager.findOne(EntitySchemas.refund_requests, {
        where: {
          transaction_id: candidate.id,
          request_type: RefundRequestType.SUBSCRIPTION_PAYMENT,
        },
        order: { created_at: 'DESC', id: 'DESC' },
      });
      rejectedPriorRefundCanBeReconciled =
        candidate.checkout_review_resolution === 'paid_refund' &&
        candidate.checkout_review_required_at !== null &&
        priorRefund?.status === 'rejected';
      if (!rejectedPriorRefundCanBeReconciled) {
        ensure(
          candidate.checkout_review_resolution === resolution &&
            candidate.checkout_review_resolution_note === input.note.trim() &&
            candidate.checkout_review_resolution_reference ===
              providerReference,
          'Checkout review was already resolved differently',
          'conflict',
        );
        if (input.outcome === 'refund')
          return {
            transaction: candidate,
            refund: await this.refunds.refund(manager, actor, {
              id: candidate.id,
              amount: Number(candidate.amount),
              reason: input.note.trim(),
              idempotency_key: `subscription-review-refund:${candidate.id}:${candidate.checkout_review_resolved_at}`,
            }),
          };
        return { transaction: candidate, refund: null };
      }
    }
    ensure(
      candidate.checkout_review_required_at,
      'Transaction is not awaiting checkout review',
      'conflict',
    );
    ensure(input.note.trim().length > 0, 'A resolution note is required');
    if (input.outcome !== 'unpaid')
      ensure(
        providerReference,
        'Provider reference is required when confirming a payment',
      );

    const transaction = await this.lockTransaction(manager, candidate.id);
    const priorRefundAfterLock =
      transaction.checkout_review_resolution === 'paid_refund'
        ? await manager.findOne(EntitySchemas.refund_requests, {
            where: {
              transaction_id: transaction.id,
              request_type: RefundRequestType.SUBSCRIPTION_PAYMENT,
            },
            order: { created_at: 'DESC', id: 'DESC' },
          })
        : null;
    const canSupersedeRejectedRefund =
      rejectedPriorRefundCanBeReconciled &&
      priorRefundAfterLock?.status === 'rejected';
    ensure(
      transaction.checkout_review_required_at &&
        (!transaction.checkout_review_resolution || canSupersedeRejectedRefund),
      'Transaction is not awaiting checkout review',
      'conflict',
    );
    const now = new Date().toISOString();
    if (input.outcome === 'unpaid') {
      ensure(
        transaction.status === 'pending',
        'A paid or failed transaction cannot be resolved as unpaid',
        'conflict',
      );
      await updateEntity(manager, EntitySchemas.transactions, transaction.id, {
        status: 'failed',
        checkout_expired_at: transaction.checkout_expired_at ?? now,
        checkout_review_required_at: null,
        checkout_reconciliation_next_at: null,
        checkout_url: null,
        qr_code: null,
        checkout_review_resolution: resolution,
        checkout_review_resolved_by: admin.id,
        checkout_review_resolved_at: now,
        checkout_review_resolution_reference: null,
        checkout_review_resolution_note: input.note.trim(),
      });
    } else {
      ensure(
        transaction.status === 'pending' || transaction.status === 'paid',
        'Failed transactions cannot be resolved as paid',
        'conflict',
      );
      await updateEntity(manager, EntitySchemas.transactions, transaction.id, {
        status: 'paid',
        checkout_review_required_at: null,
        checkout_reconciliation_next_at: null,
        checkout_url: null,
        qr_code: null,
        checkout_review_resolution: resolution,
        checkout_review_resolved_by: admin.id,
        checkout_review_resolved_at: now,
        checkout_review_resolution_reference: providerReference,
        checkout_review_resolution_note: input.note.trim(),
      });
    }

    const refund =
      input.outcome === 'refund'
        ? await this.refunds.refund(manager, actor, {
            id: transaction.id,
            amount: Number(transaction.amount),
            reason: input.note.trim(),
            idempotency_key: `subscription-review-refund:${transaction.id}:${now}`,
          })
        : null;
    return {
      transaction: await required(manager, 'transactions', transaction.id),
      refund,
    };
  }

  /**
   * Create a subscription payment transaction and attach an idempotency key.
   *
   * @param manager EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @param subscriptionId Subscription ID.
   * @param price Price to apply to the plan or transaction.
   * @param idempotencyKey Idempotency key.
   * @returns Result returned by `save`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async subscriptionIntent(
    manager: EntityManager,
    userId: string,
    subscriptionId: string,
    price: number,
    idempotencyKey: string,
  ) {
    Payment.assertAmount(price);
    const existing = await manager.findOneBy(EntitySchemas.transactions, {
      reference_id: subscriptionId,
      type: 'subscription',
    });
    if (existing) {
      ensure(
        existing.user_id === userId && Number(existing.amount) === price,
        'Existing subscription payment does not match current subscription',
        'conflict',
      );
      return existing;
    }
    return manager.save(EntitySchemas.transactions, {
      user_id: userId,
      transaction_code: `subscription:${subscriptionId}`,
      type: 'subscription',
      reference_id: subscriptionId,
      amount: price,
      idempotency_key: idempotencyKey,
      payment_gateway: this.gateway.activeProvider,
      checkout_expires_at: Payment.checkoutExpiresAt(),
    });
  }

  /**
   * Delegate booking-cancellation refund creation to the refund subdomain.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param requestedBy User or system identity that requested the refund.
   * @param reason Reason attached to the cancellation refund.
   * @returns Promise that resolves when applicable refund requests are created.
   * @throws {DomainError} Thrown when the booking is missing or its payment data conflicts with the refund rules.
   */
  requestCancellationRefunds(
    manager: EntityManager,
    bookingId: string,
    requestedBy: string | null,
    reason: string | null,
  ) {
    return this.refunds.requestCancellationRefunds(
      manager,
      bookingId,
      requestedBy,
      reason,
    );
  }

  /**
   * Release the held booking payment using the idempotency key.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param settlementKey Settlement idempotency key.
   * @returns Result returned by `releaseBookingEscrow`.
   */
  releaseBookingEscrow(
    manager: EntityManager,
    bookingId: string,
    settlementKey: string,
  ) {
    return this.wallets.releaseBookingEscrow(manager, bookingId, settlementKey);
  }

  /**
   * Lock a transaction in the database before changing its status or amount.
   *
   * @param manager EntityManager for the current transaction.
   * @param id ID of the record to process.
   * @returns Processed transaction value.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
   * Emit a booking payment update after recording the transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @returns No value is returned.
   */
  private async emitBookingPayment(
    manager: EntityManager,
    bookingId: string,
    transaction: TransactionEntity,
  ) {
    const booking = await required(manager, 'bookings', bookingId);
    const photographer = await required(
      manager,
      'photographers',
      booking.photographer_id,
    );
    await emit(
      manager,
      'payment.received',
      [transaction.user_id, photographer.user_id],
      {
        booking_id: booking.id,
        transaction_id: transaction.id,
      },
    );
  }
}
