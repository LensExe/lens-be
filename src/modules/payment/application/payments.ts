import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import {
  PaymentGateway,
  type Actor,
  type Session,
  type UnitOfWork,
} from '@shared/database/unit-of-work/unit-of-work.port';
import {
  bookingAccess,
  currentUser,
  required,
  emit,
  page,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Payment } from '../domain/payment';

@Injectable()
export class PaymentUseCases {
  constructor(private readonly gateway: PaymentGateway) {}
  async intent(
    s: Session,
    a: Actor,
    i: { id: string; idempotency_key: string },
    type: 'deposit' | 'remaining',
  ) {
    const { booking: b, user } = await bookingAccess(s, a, i.id, 'customer');
    ensure(
      ['accepted', 'in_progress', 'shot'].includes(b.status),
      'Booking cannot be paid in this state',
      'conflict',
    );
    const payments = await s.find('transactions', { reference_id: b.id });
    const existing = payments.find((t) => t.type === type);
    if (existing) return existing;
    if (type === 'remaining')
      ensure(
        payments.some((t) => t.type === 'deposit' && t.status === 'paid'),
        'Pay the deposit first',
        'conflict',
      );
    const amount =
      type === 'deposit'
        ? Number(b.deposit_amount)
        : Number(b.total_amount) - Number(b.deposit_amount);
    const t = await s.insert('transactions', {
      user_id: user.id,
      transaction_code: `${type}:${b.id}`,
      type,
      reference_id: b.id,
      amount,
      idempotency_key: i.idempotency_key,
    });
    return t;
  }
  async fulfill(uow: UnitOfWork, t: Awaited<ReturnType<typeof this.access>>) {
    if (t.checkout_url || t.status === 'paid') return t;
    // Intent was committed before any external call. A failed/ambiguous create
    // keeps the order code durable so webhooks and retries can still reconcile.
    const link = await this.gateway.create(
      Number(t.provider_order_code),
      Number(t.amount),
    );
    return uow.write((s) => s.update('transactions', t.id, link));
  }
  deposit(s: Session, a: Actor, i: Inputs.PaymentDepositCommandInput) {
    return this.intent(s, a, i, 'deposit');
  }
  remaining(s: Session, a: Actor, i: Inputs.PaymentRemainingCommandInput) {
    return this.intent(s, a, i, 'remaining');
  }
  async access(s: Session, a: Actor, id: string) {
    const t = await required(s, 'transactions', id),
      u = await currentUser(s, a);
    if (t.user_id !== u.id && !a.roles.includes('admin')) {
      ensure(t.type !== 'subscription', 'Payment access denied', 'forbidden');
      await bookingAccess(s, a, t.reference_id);
    }
    return t;
  }
  get(s: Session, a: Actor, i: { id: string }) {
    return this.access(s, a, i.id);
  }
  async qr(s: Session, a: Actor, i: { id: string }) {
    const t = await this.access(s, a, i.id);
    return {
      id: t.id,
      status: t.status,
      qr_code: t.qr_code,
      checkout_url: t.checkout_url,
    };
  }
  async history(s: Session, a: Actor, i: { id: string }) {
    await bookingAccess(s, a, i.id);
    return { items: await s.find('transactions', { reference_id: i.id }) };
  }
  async webhook(
    s: Session,
    _a: Actor,
    i: { provider: string; payload: unknown },
  ) {
    ensure(i.provider === 'payos', 'Unsupported payment provider');
    const verified = await this.gateway.verify(i.payload);
    ensure(verified.success, 'Payment callback is not successful');
    const [t] = await s.find('transactions', {
      provider_order_code: verified.orderCode,
    });
    ensure(t, 'Unknown payment order', 'missing');
    new Payment(Number(t.amount), t.status).acceptCallback(verified.amount);
    const [processed] = await s.find('payment_webhooks', {
      provider: i.provider,
      reference: verified.reference,
    });
    if (processed) {
      ensure(
        processed.transaction_id === t.id,
        'Webhook reference collision',
        'conflict',
      );
      return { received: true, duplicate: true };
    }
    await s.insert('payment_webhooks', {
      provider: i.provider,
      reference: verified.reference,
      transaction_id: t.id,
    });
    if (t.status === 'paid') return { received: true, duplicate: true };
    await s.update('transactions', t.id, { status: 'paid' });
    if (t.type === 'subscription') {
      const sub = await required(s, 'subscriptions', t.reference_id);
      await s.update('subscriptions', sub.id, {
        status: 'active',
        expired_in: new Date(
          Date.now() + sub.billing_cycle * 864e5,
        ).toISOString(),
      });
      await emit(s, 'payment.subscription', [t.user_id], {
        subscription_id: sub.id,
        transaction_id: t.id,
      });
    } else {
      const b = await required(s, 'bookings', t.reference_id),
        p = await required(s, 'photographers', b.photographer_id);
      await emit(s, 'payment.received', [t.user_id, p.user_id], {
        booking_id: b.id,
        transaction_id: t.id,
      });
      // Late successful payments stay accounted for even after cancellation.
      if (['cancelled', 'rejected'].includes(b.status))
        await s.insert('refund_requests', {
          transaction_id: t.id,
          user_id: t.user_id,
          amount: t.amount,
          reason:
            'Payment arrived after cancellation; requires settlement review',
        });
    }
    return { received: true, duplicate: false };
  }
  async refund(
    s: Session,
    a: Actor,
    i: { id: string; amount: number; reason: string },
  ) {
    role(a, 'admin', 'system');
    await currentUser(s, a);
    const t = await required(s, 'transactions', i.id);
    ensure(
      t.status === 'paid',
      'Only paid transactions may be refunded',
      'conflict',
    );
    const reserved = (await s.find('refund_requests', { transaction_id: t.id }))
      .filter((r) => r.status !== 'rejected')
      .reduce((n, r) => n + Number(r.amount), 0);
    new Payment(Number(t.amount), t.status).requestRefund(i.amount, reserved);
    return s.insert('refund_requests', {
      transaction_id: t.id,
      user_id: t.user_id,
      amount: i.amount,
      reason: i.reason,
    });
  }
  async refunds(s: Session, a: Actor, i: { id: string }) {
    const t = await this.access(s, a, i.id),
      u = await currentUser(s, a);
    ensure(
      t.user_id === u.id || a.roles.includes('admin'),
      'Refund access denied',
      'forbidden',
    );
    return { items: await s.find('refund_requests', { transaction_id: i.id }) };
  }
  async admin(s: Session, a: Actor, i: Inputs.PaymentAdminQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find('transactions')).filter(
        (t) => !i.status || t.status === i.status,
      ),
      i,
    );
  }
  async subscriptionIntent(
    s: Session,
    userId: string,
    subscriptionId: string,
    price: number,
    key: string,
  ) {
    const [existing] = await s.find('transactions', {
      reference_id: subscriptionId,
      type: 'subscription',
    });
    return (
      existing ??
      (await s.insert('transactions', {
        user_id: userId,
        transaction_code: `subscription:${subscriptionId}`,
        type: 'subscription',
        reference_id: subscriptionId,
        amount: price,
        idempotency_key: key,
      }))
    );
  }
}
