import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
  UnitOfWork,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser, required } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Subscription } from '../domain/subscription';
import { PaymentUseCases } from '@modules/payment/application/payments';

@Injectable()
export class SubscriptionUseCases {
  constructor(private readonly payments: PaymentUseCases) {}
  async fulfill(
    uow: UnitOfWork,
    result: Awaited<ReturnType<SubscriptionUseCases['create']>>,
  ) {
    return {
      ...result,
      payment: await this.payments.fulfill(uow, result.payment),
    };
  }
  async plans(s: Session) {
    const items = [] as any[];
    for (const p of await s.find('photographer_plans', { is_active: true }))
      items.push({
        ...p,
        features: await s.find('features', {
          photographer_plan_id: p.id,
          is_active: true,
        }),
      });
    return {
      items,
      booking_plans: await s.find('booking_plans', { is_active: true }),
    };
  }
  async create(
    s: Session,
    a: Actor,
    i: { plan_id: string; idempotency_key: string },
  ) {
    const u = await currentUser(s, a),
      p = await required(s, 'photographer_plans', i.plan_id);
    ensure(p.is_active, 'Plan inactive', 'conflict');
    for (const old of await s.find('subscriptions', {
      user_id: u.id,
      status: 'active',
    }))
      if (old.expired_in && Date.parse(old.expired_in) <= Date.now())
        await s.update('subscriptions', old.id, { status: 'expired' });
    const [live] = (await s.find('subscriptions', { user_id: u.id })).filter(
      (x) => ['pending', 'active'].includes(x.status),
    );
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
    const [photographer] = await s.find('photographers', { user_id: u.id });
    const sub = await s.insert('subscriptions', {
      user_id: u.id,
      photographer_id: photographer?.id,
      plan_id: p.id,
      price: p.price,
      billing_cycle: p.billing_cycle,
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
  async me(s: Session, a: Actor) {
    const u = await currentUser(s, a),
      [sub] = await s.find(
        'subscriptions',
        { user_id: u.id },
        { descending: true, limit: 1 },
      );
    if (!sub) return { subscription: null, features: [] };
    const effectiveStatus = new Subscription(
      sub.status,
      sub.expired_in,
    ).effectiveStatus();
    return {
      subscription: { ...sub, status: effectiveStatus },
      features: await s.find('features', {
        photographer_plan_id: sub.plan_id,
        is_active: true,
      }),
    };
  }
  async cancel(s: Session, a: Actor, i: { id: string }) {
    const u = await currentUser(s, a),
      sub = await required(s, 'subscriptions', i.id);
    ensure(sub.user_id === u.id, 'Subscription access denied', 'forbidden');
    return s.update('subscriptions', sub.id, { auto_renew: false });
  }
  async usage(s: Session, a: Actor) {
    const u = await currentUser(s, a),
      current = await this.me(s, a);
    return {
      ...current,
      storage_bytes: (
        await s.find('media', { user_id: u.id, status: 'ready' })
      ).reduce((n, m) => n + Number(m.file_size), 0),
    };
  }
  webhook(s: Session, a: Actor, i: Inputs.SubscriptionWebhookCommandInput) {
    return this.payments.webhook(s, a, i);
  }
}
