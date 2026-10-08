import {
  In,
  LessThanOrEqual,
  type DataSource,
  type EntityManager,
} from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  emit,
  photographer,
  required,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Subscription } from './subscription.domain';
import { SubscriptionPaymentsPort } from './ports/subscription-payments.port';
import { SubscriptionHistoryEvent } from '@shared/domain/values/subscription.values';
import type {
  SubscriptionHistoryActorRole,
  SubscriptionHistoryEvent as SubscriptionHistoryEventType,
  SubscriptionStatus,
} from '@shared/domain/values/subscription.values';
import { SubscriptionStorageQuotaPort } from '@modules/media/ports/subscription-storage-quota.port';
import { SubscriptionStorageUsagePort } from './ports/subscription-storage-usage.port';
import { SubscriptionPortfolioQuotaPort } from '@modules/photographer/ports/subscription-portfolio-quota.port';

@Injectable()
export class SubscriptionUseCases
  implements SubscriptionStorageQuotaPort, SubscriptionPortfolioQuotaPort
{
  constructor(
    private readonly payments: SubscriptionPaymentsPort,
    private readonly storageUsage: SubscriptionStorageUsagePort,
  ) {}

  /**
   * Settle a paid transaction and update the balance or related status.
   *
   * @param dataSource Data source used to open a transaction.
   * @param result Value used by the operation: result.
   * @returns Result object containing the fields `payment`.
   */
  async fulfill(
    dataSource: DataSource,
    result: Awaited<ReturnType<SubscriptionUseCases['create']>>,
  ) {
    return {
      ...result,
      payment: await this.payments.fulfill(dataSource, result.payment),
    };
  }

  /**
   * List the subscriptions available for enrollment.
   *
   * @param s EntityManager for the current transaction.
   * @returns Active photographer membership plans.
   */
  async plans(s: EntityManager) {
    return {
      items: await s.find(EntitySchemas.photographer_plans, {
        where: { is_active: true },
        order: { price: 'ASC', billing_cycle: 'ASC', id: 'ASC' },
      }),
    };
  }

  /**
   * Create a subscription after validating the input and business rules.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result object containing the fields `subscription`, `payment`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.SubscriptionCreateCommandInput,
  ) {
    const u = await currentUser(s, a),
      owner = await photographer(s, a),
      p = await required(s, 'photographer_plans', i.photographer_plan_id);
    // Serialize create attempts for the same photographer before checking the one-live invariant.
    await s.findOne(EntitySchemas.photographers, {
      where: { id: owner.id },
      lock: { mode: 'pessimistic_write' },
    });
    for (const old of await s.findBy(EntitySchemas.subscriptions, {
      photographer_id: owner.id,
      status: 'active',
    }))
      if (Date.parse(old.end_at) <= Date.now()) await this.expire(s, old.id);
    const [live] = (
      await s.findBy(EntitySchemas.subscriptions, {
        photographer_id: owner.id,
      })
    ).filter((x) => ['pending', 'active'].includes(x.status));
    if (live) {
      ensure(
        live.status === 'pending' && live.plan_id === p.id,
        'Existing subscription must expire first',
        'conflict',
      );
      return {
        subscription: live,
        payment: await this.payments.subscriptionIntent(
          s,
          u.id,
          live.id,
          Number(live.price),
          i.idempotency_key,
        ),
      };
    }
    ensure(p.is_active, 'Plan inactive', 'conflict');
    Subscription.assertFeaturesValid(p.features);
    const startAt = new Date().toISOString();
    const planSnapshot = {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      billing_cycle: p.billing_cycle,
      features: p.features,
    };
    const sub = await s.save(EntitySchemas.subscriptions, {
      photographer_id: owner.id,
      plan_id: p.id,
      plan_snapshot: planSnapshot,
      ...Subscription.period(startAt, p.billing_cycle),
      price: p.price,
    });
    await this.recordHistory(s, {
      subscription_id: sub.id,
      event_type: SubscriptionHistoryEvent.CREATED,
      from_status: null,
      to_status: 'pending',
      actor_user_id: u.id,
      actor_role: 'user',
      transaction_id: null,
      note: `Subscribed to ${p.code}`,
    });
    return {
      subscription: sub,
      payment: await this.payments.subscriptionIntent(
        s,
        u.id,
        sub.id,
        Number(sub.price),
        i.idempotency_key,
      ),
    };
  }

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @returns Result object containing the fields `subscription`, `features`.
   */
  async me(s: EntityManager, a: Actor) {
    const owner = await photographer(s, a),
      [sub] = await s.find(EntitySchemas.subscriptions, {
        where: { photographer_id: owner.id },
        order: { created_at: 'DESC', id: 'ASC' },
        take: 1,
      });
    if (!sub) return { subscription: null, features: [] };
    const effectiveStatus = new Subscription(
      sub.status,
      sub.end_at,
    ).effectiveStatus();
    const features =
      effectiveStatus === 'active' ? await this.features(s, sub) : [];
    return {
      subscription: { ...sub, status: effectiveStatus },
      features,
    };
  }

  /** Resolve a late or uncertain subscription payment with an audited admin decision. */
  async resolvePaymentReview(
    s: EntityManager,
    a: Actor,
    input: Inputs.SubscriptionPaymentReviewResolutionInput,
  ) {
    role(a, 'admin');
    const admin = await currentUser(s, a);
    const candidate = await s.findOneBy(EntitySchemas.transactions, {
      id: input.subscription_payment_id,
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
      const priorRefund = await s.findOne(EntitySchemas.refund_requests, {
        where: {
          transaction_id: candidate.id,
          request_type: 'subscription_payment',
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
        const result = await this.payments.resolveSubscriptionReview(
          s,
          a,
          input,
        );
        return {
          ...result,
          subscription: await required(
            s,
            'subscriptions',
            candidate.reference_id,
          ),
        };
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

    const subscriptionSnapshot = await s.findOneBy(
      EntitySchemas.subscriptions,
      { id: candidate.reference_id },
    );
    ensure(subscriptionSnapshot, 'Subscription not found', 'missing');
    const photographerRow = await s.findOne(EntitySchemas.photographers, {
      where: { id: subscriptionSnapshot.photographer_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(photographerRow, 'Photographer not found', 'missing');
    const transaction = await s.findOne(EntitySchemas.transactions, {
      where: { id: candidate.id },
      lock: { mode: 'pessimistic_write' },
    });
    const priorRefundAfterLock =
      transaction?.checkout_review_resolution === 'paid_refund'
        ? await s.findOne(EntitySchemas.refund_requests, {
            where: {
              transaction_id: candidate.id,
              request_type: 'subscription_payment',
            },
            order: { created_at: 'DESC', id: 'DESC' },
          })
        : null;
    const canSupersedeRejectedRefund =
      rejectedPriorRefundCanBeReconciled &&
      priorRefundAfterLock?.status === 'rejected';
    ensure(
      transaction?.type === 'subscription' &&
        transaction.reference_id === candidate.reference_id &&
        transaction.checkout_review_required_at &&
        (!transaction.checkout_review_resolution || canSupersedeRejectedRefund),
      'Transaction is not awaiting checkout review',
      'conflict',
    );
    const subscription = await s.findOne(EntitySchemas.subscriptions, {
      where: { id: candidate.reference_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(subscription, 'Subscription not found', 'missing');

    let nextStatus = subscription.status;
    const now = new Date().toISOString();
    if (input.outcome === 'unpaid') {
      ensure(
        transaction.status === 'pending',
        'A paid or failed transaction cannot be resolved as unpaid',
        'conflict',
      );
      if (subscription.status === 'pending') {
        await updateEntity(s, EntitySchemas.subscriptions, subscription.id, {
          status: 'cancelled',
          auto_renew: false,
          cancel_at_period_end: false,
        });
        nextStatus = 'cancelled';
      }
    } else if (input.outcome === 'activate') {
      ensure(
        ['pending', 'cancelled', 'expired'].includes(subscription.status),
        'Only a pending or closed subscription can be activated by reconciliation',
        'conflict',
      );
      ensure(
        transaction.status === 'pending' || transaction.status === 'paid',
        'Failed transactions cannot be resolved as paid',
        'conflict',
      );
      const anotherLiveSubscription = await s
        .createQueryBuilder(EntitySchemas.subscriptions, 'subscription')
        .where('subscription.photographer_id = :photographerId', {
          photographerId: subscription.photographer_id,
        })
        .andWhere('subscription.id <> :subscriptionId', {
          subscriptionId: subscription.id,
        })
        .andWhere('subscription.status IN (:...statuses)', {
          statuses: ['pending', 'active'],
        })
        .getOne();
      ensure(
        !anotherLiveSubscription,
        'Photographer already has another live subscription; refund this payment instead',
        'conflict',
      );
      const previousPeriodDays =
        (Date.parse(subscription.end_at) - Date.parse(subscription.start_at)) /
        86_400_000;
      const billingCycleDays =
        subscription.plan_snapshot?.billing_cycle ?? previousPeriodDays;
      ensure(
        Number.isSafeInteger(billingCycleDays) && billingCycleDays > 0,
        'Subscription billing period is invalid',
        'conflict',
      );
      await updateEntity(s, EntitySchemas.subscriptions, subscription.id, {
        ...Subscription.period(now, billingCycleDays),
        status: 'active',
      });
      nextStatus = 'active';
    } else {
      ensure(
        transaction.status === 'pending' || transaction.status === 'paid',
        'Failed transactions cannot be resolved as paid',
        'conflict',
      );
      if (['pending', 'active'].includes(subscription.status)) {
        await updateEntity(s, EntitySchemas.subscriptions, subscription.id, {
          status: 'cancelled',
          auto_renew: false,
          cancel_at_period_end: false,
        });
        nextStatus = 'cancelled';
      }
    }

    const payment = await this.payments.resolveSubscriptionReview(s, a, input);
    await this.recordHistory(s, {
      subscription_id: subscription.id,
      event_type:
        input.outcome === 'activate'
          ? SubscriptionHistoryEvent.PAYMENT_ACTIVATED
          : SubscriptionHistoryEvent.PAYMENT_RECONCILED,
      from_status: subscription.status,
      to_status: nextStatus,
      actor_user_id: admin.id,
      actor_role: 'admin',
      transaction_id: transaction.id,
      note:
        input.outcome === 'unpaid'
          ? 'Provider reconciliation confirmed that no payment was received; checkout closed.'
          : input.outcome === 'refund'
            ? 'Payment reconciled; a refund request was submitted for administrator processing.'
            : 'Payment manually reconciled and the subscription activated.',
    });
    if (input.outcome === 'activate')
      await emit(s, 'payment.subscription', [transaction.user_id], {
        subscription_id: subscription.id,
        transaction_id: transaction.id,
        reconciled_by_admin: true,
      });
    if (input.outcome === 'unpaid')
      await emit(
        s,
        'payment.checkout_reconciled_unpaid',
        [transaction.user_id],
        { transaction_id: transaction.id },
      );

    return {
      ...payment,
      subscription: await required(s, 'subscriptions', subscription.id),
    };
  }

  /**
   * Cancel a subscription and apply the related business rules.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `updateEntity`.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async cancel(
    s: EntityManager,
    a: Actor,
    i: Inputs.SubscriptionCancelCommandInput,
  ) {
    const user = await currentUser(s, a);
    const owner = await photographer(s, a),
      sub = await s.findOne(EntitySchemas.subscriptions, {
        where: { id: i.subscription_id },
        lock: { mode: 'pessimistic_write' },
      });
    ensure(sub, 'subscriptions not found', 'missing');
    ensure(
      sub.photographer_id === owner.id,
      'Subscription access denied',
      'forbidden',
    );
    ensure(
      new Subscription(sub.status, sub.end_at).effectiveStatus() === 'active',
      'Only an active subscription can cancel renewal',
      'conflict',
    );
    if (sub.cancel_at_period_end) return sub;
    const updated = await updateEntity(s, EntitySchemas.subscriptions, sub.id, {
      auto_renew: false,
      cancel_at_period_end: true,
    });
    await this.recordHistory(s, {
      subscription_id: sub.id,
      event_type: SubscriptionHistoryEvent.RENEWAL_CANCELLED,
      from_status: sub.status,
      to_status: sub.status,
      actor_user_id: user.id,
      actor_role: 'user',
      transaction_id: null,
      note: 'Renewal cancelled at the end of the paid period.',
    });
    await emit(s, 'subscription.renewal_cancelled', [user.id], {
      subscription_id: sub.id,
      end_at: sub.end_at,
    });
    return updated;
  }

  /**
   * Summarize the current subscription usage for the user.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @returns Result object containing the fields `storage_bytes`.
   */
  async usage(s: EntityManager, a: Actor) {
    const u = await currentUser(s, a),
      owner = await photographer(s, a),
      current = await this.me(s, a);
    const { storage_bytes, reserved_storage_bytes, total_bytes } =
      await this.storageUsage.usage(s, u.id);
    const portfolio_count = await s.countBy(EntitySchemas.portfolios, {
      photographer_id: owner.id,
    });
    const storage_limit_bytes =
      current.subscription?.status === 'active'
        ? Subscription.storageLimitBytes(current.features)
        : null;
    const portfolio_limit =
      current.subscription?.status === 'active'
        ? Subscription.portfolioLimit(current.features)
        : null;
    return {
      ...current,
      storage_bytes,
      reserved_storage_bytes,
      storage_limit_bytes,
      storage_remaining_bytes:
        storage_limit_bytes === null
          ? null
          : Math.max(storage_limit_bytes - total_bytes, 0),
      storage_over_limit:
        storage_limit_bytes !== null && total_bytes > storage_limit_bytes,
      portfolio_count,
      portfolio_limit,
      portfolio_remaining_count:
        portfolio_limit === null
          ? null
          : Math.max(portfolio_limit - portfolio_count, 0),
      portfolio_over_limit:
        portfolio_limit !== null && portfolio_count > portfolio_limit,
    };
  }

  /** Return the current photographer's lifecycle events, newest first. */
  async history(s: EntityManager, a: Actor) {
    const owner = await photographer(s, a);
    const subscriptions = await s.find(EntitySchemas.subscriptions, {
      where: { photographer_id: owner.id },
      select: { id: true },
    });
    if (!subscriptions.length) return { items: [] };
    return {
      items: await s.find(EntitySchemas.subscription_status_history, {
        where: { subscription_id: In(subscriptions.map(({ id }) => id)) },
        order: { created_at: 'DESC', id: 'DESC' },
        take: 100,
      }),
    };
  }

  /** Expire active periods whose paid-through date has passed. */
  async expireDue(s: EntityManager, a: Actor, now = Date.now()) {
    role(a, 'system');
    const due = await s.find(EntitySchemas.subscriptions, {
      where: {
        status: 'active',
        end_at: LessThanOrEqual(new Date(now).toISOString()),
      },
      order: { end_at: 'ASC', id: 'ASC' },
      take: 100,
      lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
    });
    for (const sub of due) await this.expire(s, sub.id);
    return { processed: due.length };
  }

  /** Enforce the active subscription's storage cap before Media reserves an upload. */
  async assertUploadAllowed(
    s: EntityManager,
    userId: string,
    currentBytes: number,
    requestedBytes: number,
  ) {
    const owner = await s.findOneBy(EntitySchemas.photographers, {
      user_id: userId,
    });
    if (!owner) return;
    const sub = await s.findOne(EntitySchemas.subscriptions, {
      where: { photographer_id: owner.id, status: 'active' },
      order: { created_at: 'DESC', id: 'ASC' },
    });
    if (
      !sub ||
      new Subscription(sub.status, sub.end_at).effectiveStatus() !== 'active'
    )
      return;
    const limit = Subscription.storageLimitBytes(await this.features(s, sub));
    Subscription.assertStorageAvailable(limit, currentBytes, requestedBytes);
  }

  /** Enforce the active subscription's portfolio cap before creating an album. */
  async assertPortfolioCreationAllowed(
    s: EntityManager,
    photographerId: string,
  ) {
    const sub = await s.findOne(EntitySchemas.subscriptions, {
      where: { photographer_id: photographerId, status: 'active' },
      order: { created_at: 'DESC', id: 'ASC' },
    });
    if (
      !sub ||
      new Subscription(sub.status, sub.end_at).effectiveStatus() !== 'active'
    )
      return;
    const limit = Subscription.portfolioLimit(await this.features(s, sub));
    if (limit === null) return;
    const currentCount = await s.countBy(EntitySchemas.portfolios, {
      photographer_id: photographerId,
    });
    Subscription.assertPortfolioAvailable(limit, currentCount);
  }

  /**
   * Validate and process a webhook from the provider.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `webhook`.
   */
  webhook(
    s: EntityManager,
    a: Actor,
    i: Inputs.SubscriptionWebhookCommandInput,
  ) {
    return this.payments.webhook(s, a, i);
  }

  private async features(
    s: EntityManager,
    sub: {
      plan_id: string;
      plan_snapshot: { features?: unknown[] } | null;
    },
  ) {
    if (Array.isArray(sub.plan_snapshot?.features))
      return sub.plan_snapshot.features;
    return (await required(s, 'photographer_plans', sub.plan_id)).features;
  }

  private async expire(s: EntityManager, subscriptionId: string) {
    const sub = await s.findOne(EntitySchemas.subscriptions, {
      where: { id: subscriptionId },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(sub, 'subscriptions not found', 'missing');
    if (sub.status !== 'active') return sub;
    const updated = await updateEntity(s, EntitySchemas.subscriptions, sub.id, {
      status: 'expired',
    });
    await this.recordHistory(s, {
      subscription_id: sub.id,
      event_type: SubscriptionHistoryEvent.EXPIRED,
      from_status: 'active',
      to_status: 'expired',
      actor_user_id: null,
      actor_role: 'system',
      transaction_id: null,
      note: 'Paid subscription period ended.',
    });
    const owner = await required(s, 'photographers', sub.photographer_id);
    await emit(s, 'subscription.expired', [owner.user_id], {
      subscription_id: sub.id,
      end_at: sub.end_at,
    });
    return updated;
  }

  private recordHistory(
    s: EntityManager,
    entry: {
      subscription_id: string;
      event_type: SubscriptionHistoryEventType;
      from_status: SubscriptionStatus | null;
      to_status: SubscriptionStatus;
      actor_user_id: string | null;
      actor_role: SubscriptionHistoryActorRole;
      transaction_id: string | null;
      note: string | null;
    },
  ) {
    return s.save(EntitySchemas.subscription_status_history, entry);
  }
}
