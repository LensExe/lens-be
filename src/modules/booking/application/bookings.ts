import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
  page,
  role,
} from '@shared/common/access';
import {
  Booking,
  interval,
  overlaps,
  money,
  type BookingStatus,
} from '../domain/booking';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { ReviewUseCases } from '@modules/feedback/application/reviews';

@Injectable()
export class BookingUseCases {
  constructor(private readonly reviews: ReviewUseCases) {}
  async create(
    s: Session,
    a: Actor,
    input: {
      photographer_id: string;
      plan_id: string;
      location: string;
      from: string;
      to: string;
    },
  ) {
    role(a, 'customer');
    const u = await currentUser(s, a),
      [c] = await s.find('customers', { user_id: u.id });
    ensure(c, 'Customer profile required', 'forbidden');
    const p = await required(s, 'photographers', input.photographer_id),
      pu = await required(s, 'users', p.user_id),
      plan = await required(s, 'booking_plans', input.plan_id);
    ensure(
      pu.status === 'active' && p.is_available && plan.is_active,
      'Photographer or plan unavailable',
      'conflict',
    );
    ensure(p.user_id !== u.id, 'Cannot book yourself');
    const range = interval(input.from, input.to);
    ensure(Date.parse(range.from) > Date.now(), 'Booking must start in future');
    ensure(
      (await s.find('working_slots', { photographer_id: p.id })).some(
        (x) =>
          Date.parse(x.from) <= Date.parse(range.from) &&
          Date.parse(x.to) >= Date.parse(range.to),
      ),
      'Time is outside working slots',
      'conflict',
    );
    const unavailable = [
      ...(await s.find('offline_slots', { photographer_id: p.id })),
      ...(await s.find('bookings', { photographer_id: p.id })).filter(
        (x) => !['cancelled', 'rejected'].includes(x.status),
      ),
    ];
    ensure(
      !unavailable.some((x) => overlaps(x, range)),
      'Photographer already booked or blocked',
      'conflict',
    );
    const total = money(Number(plan.price));
    const booking = await s.insert('bookings', {
      ...input,
      ...range,
      customer_id: c.id,
      total_amount: total,
      deposit_amount: Math.ceil(total * 0.3),
    });
    await s.insert('booking_timeline', {
      booking_id: booking.id,
      actor_id: u.id,
      status: 'pending',
    });
    await emit(s, 'booking.created', [u.id, p.user_id], {
      booking_id: booking.id,
      status: 'pending',
    });
    return booking;
  }
  async get(s: Session, a: Actor, input: { id: string }) {
    return (await bookingAccess(s, a, input.id)).booking;
  }
  async list(s: Session, a: Actor, input: Inputs.BookingListQueryInput) {
    const u = await currentUser(s, a),
      [c] = await s.find('customers', { user_id: u.id }),
      [p] = await s.find('photographers', { user_id: u.id });
    return page(
      (await s.find('bookings', {}, { descending: true })).filter(
        (b) =>
          (b.customer_id === c?.id || b.photographer_id === p?.id) &&
          (!input.status || b.status === input.status) &&
          (!input.from || Date.parse(b.from) >= Date.parse(input.from)) &&
          (!input.to || Date.parse(b.to) <= Date.parse(input.to)),
      ),
      input,
    );
  }
  async transition(
    s: Session,
    a: Actor,
    input: { id: string; reason?: string },
    action: string,
  ) {
    const side = ['accept', 'reject', 'start', 'completeShoot'].includes(action)
      ? 'photographer'
      : undefined;
    if (action === 'complete') role(a, 'admin', 'system');
    const {
      booking: b,
      user,
      recipients,
    } = await bookingAccess(s, a, input.id, side);
    const paid = (
      await s.find('transactions', { reference_id: b.id, status: 'paid' })
    )
      .filter((t) => ['deposit', 'remaining'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const status = new Booking(b.status as BookingStatus).transition(
      action,
      paid >=
        (action === 'start'
          ? Number(b.deposit_amount)
          : Number(b.total_amount)),
      !!b.gallery_published_at,
    );
    const row = await s.update('bookings', b.id, { status });
    if (status === 'completed')
      await this.reviews.recalculate(s, b.photographer_id);
    await s.insert('booking_timeline', {
      booking_id: b.id,
      actor_id: user.id,
      status,
      reason: input.reason,
    });
    if (['cancelled', 'rejected', 'completed'].includes(status)) {
      const [loc] = await s.find('location_sessions', { booking_id: b.id });
      if (loc)
        await s.update('location_sessions', loc.id, {
          active: false,
          latitude: null,
          longitude: null,
        });
    }
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return row;
  }
  accept(s: Session, a: Actor, i: Inputs.BookingAcceptCommandInput) {
    return this.transition(s, a, i, 'accept');
  }
  reject(s: Session, a: Actor, i: Inputs.BookingRejectCommandInput) {
    return this.transition(s, a, i, 'reject');
  }
  cancel(s: Session, a: Actor, i: Inputs.BookingCancelCommandInput) {
    return this.transition(s, a, i, 'cancel');
  }
  start(s: Session, a: Actor, i: Inputs.BookingStartCommandInput) {
    return this.transition(s, a, i, 'start');
  }
  completeShoot(
    s: Session,
    a: Actor,
    i: Inputs.BookingCompleteShootCommandInput,
  ) {
    return this.transition(s, a, i, 'completeShoot');
  }
  complete(s: Session, a: Actor, i: Inputs.BookingCompleteCommandInput) {
    return this.transition(s, a, i, 'complete');
  }
  async timeline(s: Session, a: Actor, i: { id: string }) {
    await bookingAccess(s, a, i.id);
    return { items: await s.find('booking_timeline', { booking_id: i.id }) };
  }
  async dispute(s: Session, a: Actor, i: { id: string; reason: string }) {
    const { user } = await bookingAccess(s, a, i.id);
    return s.insert('disputes', {
      booking_id: i.id,
      user_id: user.id,
      reason: i.reason,
    });
  }
  async admin(s: Session, a: Actor, input: Inputs.BookingAdminQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find('bookings')).filter(
        (b) => !input.status || b.status === input.status,
      ),
      input,
    );
  }
}
