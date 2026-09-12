import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
  page,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { RatingUpdaterPort } from './ports/rating-updater.port';
import { Booking } from './booking.domain';

@Injectable()
export class BookingUseCases {
  constructor(private readonly reviews: RatingUpdaterPort) {}

  async create(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCreateCommandInput,
  ) {
    role(a, 'customer');
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id });
    ensure(c, 'Customer profile required', 'forbidden');

    const p = await s.findOne(EntitySchemas.photographers, {
      where: { id: input.photographer_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(p, 'photographers not found', 'missing');

    const pu = await required(s, 'users', p.user_id),
      plan = await required(s, 'booking_plans', input.plan_id);

    const blockedDates = await s.findBy(EntitySchemas.offline_slots, {
      photographer_id: p.id,
    });

    const bookings = await s.findBy(EntitySchemas.bookings, {
      photographer_id: p.id,
    });

    const draft = Booking.prepare({
      customerId: c.id,
      customerUserId: u.id,
      photographerId: p.id,
      photographerUserId: p.user_id,
      photographerStatus: pu.status,
      photographerAvailable: p.is_available,
      planId: plan.id,
      planPhotographerId: plan.photographer_id,
      planActive: plan.is_active,
      planPrice: Number(plan.price),
      location: input.location,
      from: input.from,
      to: input.to,
      offlineDates: blockedDates.map((slot) => slot.date),
      bookings,
      now: Date.now(),
    });

    const booking = await s.save(EntitySchemas.bookings, draft);
    await emit(s, 'booking.created', [u.id, p.user_id], {
      booking_id: booking.id,
      status: 'pending',
    });
    return booking;
  }

  async get(s: EntityManager, a: Actor, input: Inputs.BookingGetQueryInput) {
    return (await bookingAccess(s, a, input.id)).booking;
  }

  async list(s: EntityManager, a: Actor, input: Inputs.BookingListQueryInput) {
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id }),
      [p] = await s.findBy(EntitySchemas.photographers, { user_id: u.id });
    return page(
      (
        await s.find(EntitySchemas.bookings, {
          order: { created_at: 'DESC', id: 'ASC' },
        })
      ).filter(
        (b) =>
          (b.customer_id === c?.id || b.photographer_id === p?.id) &&
          (!input.status || b.status === input.status) &&
          (!input.from || Date.parse(b.from) >= Date.parse(input.from)) &&
          (!input.to || Date.parse(b.to) <= Date.parse(input.to)),
      ),
      input,
    );
  }

  private async transition(
    s: EntityManager,
    a: Actor,
    input: { id: string; reason?: string },
    action: string,
  ) {
    const side = ['accept', 'reject', 'start', 'completeShoot'].includes(action)
      ? 'photographer'
      : undefined;
    if (action === 'complete') role(a, 'admin', 'system');
    const { booking: b, recipients } = await bookingAccess(
      s,
      a,
      input.id,
      side,
    );
    const paid = (
      await s.findBy(EntitySchemas.transactions, {
        reference_id: b.id,
        status: 'paid',
      })
    )
      .filter((t) => ['deposit', 'remaining'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const status = new Booking(b.status).transition(
      action,
      paid >=
        (action === 'start'
          ? Number(b.deposit_amount)
          : Number(b.total_amount)),
      !!b.gallery_published_at,
    );
    const row = await updateEntity(s, EntitySchemas.bookings, b.id, { status });
    if (status === 'completed')
      await this.reviews.recalculate(s, b.photographer_id);
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return row;
  }

  accept(s: EntityManager, a: Actor, i: Inputs.BookingAcceptCommandInput) {
    return this.transition(s, a, i, 'accept');
  }

  reject(s: EntityManager, a: Actor, i: Inputs.BookingRejectCommandInput) {
    return this.transition(s, a, i, 'reject');
  }

  cancel(s: EntityManager, a: Actor, i: Inputs.BookingCancelCommandInput) {
    return this.transition(s, a, i, 'cancel');
  }

  start(s: EntityManager, a: Actor, i: Inputs.BookingStartCommandInput) {
    return this.transition(s, a, i, 'start');
  }

  completeShoot(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCompleteShootCommandInput,
  ) {
    return this.transition(s, a, i, 'completeShoot');
  }

  complete(s: EntityManager, a: Actor, i: Inputs.BookingCompleteCommandInput) {
    return this.transition(s, a, i, 'complete');
  }

  async timeline(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingTimelineQueryInput,
  ) {
    const { booking } = await bookingAccess(s, a, i.id);
    return {
      items: [
        {
          booking_id: booking.id,
          status: booking.status,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        },
      ],
    };
  }

  async dispute(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingDisputeCommandInput,
  ) {
    const { user } = await bookingAccess(s, a, input.id);
    return s.save(EntitySchemas.reports, {
      user_id: user.id,
      target_type: 'booking',
      target_id: input.id,
      reason: input.reason,
    });
  }

  async admin(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingAdminQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find(EntitySchemas.bookings)).filter(
        (b) => !input.status || b.status === input.status,
      ),
      input,
    );
  }
}
