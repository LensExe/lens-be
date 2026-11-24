import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { SubscriptionHistoryEvent } from '@shared/domain/values/subscription.values';
import type { SubscriptionHistoryActorRole } from '@shared/domain/values/subscription.values';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Subscription } from './subscription.domain';
import { SubscriptionDefaultPlanPort } from './ports/subscription-default-plan.port';

/** Assigns and transitions photographers between the platform's free and paid plans. */
@Injectable()
export class DefaultSubscriptionLifecycleService extends SubscriptionDefaultPlanPort {
  async assignDefault(
    manager: EntityManager,
    photographerId: string,
    actorUserId: string | null,
    actorRole: SubscriptionHistoryActorRole,
  ) {
    const existing = await manager.findOne(EntitySchemas.subscriptions, {
      where: { photographer_id: photographerId, status: 'active' },
      order: { created_at: 'DESC', id: 'DESC' },
    });
    if (existing) return existing;

    const plan = await manager.findOne(EntitySchemas.photographer_plans, {
      where: { is_default: true, is_active: true },
    });
    if (!plan) return null;
    ensure(Number(plan.price) === 0, 'Default plan must be free', 'conflict');
    Subscription.assertFeaturesValid(plan.features);

    const startAt = new Date().toISOString();
    const subscription = await manager.save(EntitySchemas.subscriptions, {
      photographer_id: photographerId,
      plan_id: plan.id,
      plan_snapshot: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: 0,
        billing_cycle: plan.billing_cycle,
        features: plan.features,
        is_default: true,
      },
      start_at: startAt,
      end_at: null,
      status: 'active',
      auto_renew: false,
      cancel_at_period_end: false,
      price: 0,
    });
    await manager.save(EntitySchemas.subscription_status_history, {
      subscription_id: subscription.id,
      event_type: SubscriptionHistoryEvent.DEFAULT_ASSIGNED,
      from_status: null,
      to_status: 'active',
      actor_user_id: actorUserId,
      actor_role: actorRole,
      transaction_id: null,
      note: `Default free plan ${plan.code} assigned.`,
    });
    return subscription;
  }

  async replaceDefaultWithPaid(
    manager: EntityManager,
    photographerId: string,
    transactionId: string,
  ) {
    const activeSubscriptions = await manager.findBy(
      EntitySchemas.subscriptions,
      { photographer_id: photographerId, status: 'active' },
    );
    const now = new Date().toISOString();

    for (const subscription of activeSubscriptions) {
      let isDefault = subscription.plan_snapshot?.is_default === true;
      if (!isDefault) {
        const plan = await manager.findOneBy(EntitySchemas.photographer_plans, {
          id: subscription.plan_id,
        });
        isDefault = plan?.is_default === true;
      }
      if (!isDefault) continue;

      await manager.save(EntitySchemas.subscriptions, {
        ...subscription,
        status: 'cancelled',
        end_at: now,
        auto_renew: false,
        cancel_at_period_end: false,
      });
      await manager.save(EntitySchemas.subscription_status_history, {
        subscription_id: subscription.id,
        event_type: SubscriptionHistoryEvent.DEFAULT_REPLACED,
        from_status: 'active',
        to_status: 'cancelled',
        actor_user_id: null,
        actor_role: 'system',
        transaction_id: transactionId,
        note: 'Default free plan closed after paid plan activation.',
      });
    }
  }
}
