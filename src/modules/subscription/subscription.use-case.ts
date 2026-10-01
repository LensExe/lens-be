import type { DataSource, EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import { currentUser, photographer, required } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Subscription } from './subscription.domain';
import { SubscriptionPaymentsPort } from './ports/subscription-payments.port';

@Injectable()
export class SubscriptionUseCases {
  constructor(private readonly payments: SubscriptionPaymentsPort) {}

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
   * @returns Result object containing the fields `items`, `booking_plans`.
   */
  async plans(s: EntityManager) {
    return {
      items: await s.findBy(EntitySchemas.photographer_plans, {
        is_active: true,
      }),
      booking_plans: await s.findBy(EntitySchemas.booking_plans, {
        is_active: true,
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
      p = await required(s, 'photographer_plans', i.plan_id);
    ensure(p.is_active, 'Plan inactive', 'conflict');
    for (const old of await s.findBy(EntitySchemas.subscriptions, {
      photographer_id: owner.id,
      status: 'active',
    }))
      if (Date.parse(old.end_at) <= Date.now())
        await updateEntity(s, EntitySchemas.subscriptions, old.id, {
          status: 'expired',
        });
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
    const startAt = new Date().toISOString();
    const sub = await s.save(EntitySchemas.subscriptions, {
      photographer_id: owner.id,
      plan_id: p.id,
      ...Subscription.period(startAt, p.billing_cycle),
      price: p.price,
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
    return {
      subscription: { ...sub, status: effectiveStatus },
      features: (await required(s, 'photographer_plans', sub.plan_id)).features,
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
    await currentUser(s, a);
    const owner = await photographer(s, a),
      sub = await required(s, 'subscriptions', i.id);
    ensure(
      sub.photographer_id === owner.id,
      'Subscription access denied',
      'forbidden',
    );
    return updateEntity(s, EntitySchemas.subscriptions, sub.id, {
      auto_renew: false,
    });
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
      current = await this.me(s, a);
    return {
      ...current,
      storage_bytes: (
        await s.findBy(EntitySchemas.media, { user_id: u.id, status: 'ready' })
      ).reduce((n, m) => n + Number(m.file_size), 0),
    };
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
}
