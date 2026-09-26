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
import { Booking, type BookingActorRole } from './booking.domain';
import type { BookingEntity } from '@shared/database/entities/booking.entity';

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

    const schedule = await s.findBy(EntitySchemas.working_hours, {
      photographer_id: p.id,
    });

    const blockedTimes = await s.findBy(EntitySchemas.offline_slots, {
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
      photographerVerified: p.verification_status === 'verified',
      photographerAvailable: p.is_available,
      planId: plan.id,
      planPhotographerId: plan.photographer_id,
      planActive: plan.is_active,
      planPrice: Number(plan.price),
      planDurationMinutes: plan.duration_minutes,
      location: input.location,
      from: input.from,
      to: input.to,
      schedule,
      blockedTimes,
      bookings,
      now: Date.now(),
    });

    const booking = await s.save(EntitySchemas.bookings, draft);
    await s.save(EntitySchemas.booking_status_history, {
      booking_id: booking.id,
      from_status: null,
      to_status: booking.status,
      actor_role: 'customer',
      actor_user_id: u.id,
      reason: null,
    });
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

  /**
   * Chuyển trạng thái theo yêu cầu của người dùng: kiểm quyền trên booking rồi áp dụng.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor gửi request
   * @param input ID booking và lý do (reject / cancel)
   * @param action Tên hành động trong máy trạng thái
   * @returns Booking sau khi đổi trạng thái
   */
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
    const {
      booking: b,
      user,
      customer,
      photographer,
      recipients,
    } = await bookingAccess(s, a, input.id, side);
    return this.apply(
      s,
      b,
      action,
      {
        role: Booking.actorRole(
          user.id,
          customer.user_id,
          photographer.user_id,
          a.roles,
        ),
        userId: user.id,
      },
      input.reason ?? null,
      recipients,
    );
  }

  /**
   * Áp dụng một hành động lên booking đã được kiểm quyền: kiểm luật, lưu trạng thái,
   * ghi lịch sử, chạy hệ quả khi completed, bắn realtime. Dùng chung cho request và job nền.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking cần đổi
   * @param action Tên hành động trong máy trạng thái
   * @param actor Bên thực hiện; `userId` là `null` khi job nền (`role = 'system'`)
   * @param reason Lý do (reject / cancel), không có thì `null`
   * @param recipients User nhận realtime (khách và thợ)
   * @returns Booking sau khi đổi trạng thái
   */
  private async apply(
    s: EntityManager,
    b: BookingEntity,
    action: string,
    actor: { role: BookingActorRole; userId: string | null },
    reason: string | null,
    recipients: string[],
  ) {
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
    await s.save(EntitySchemas.booking_status_history, {
      booking_id: b.id,
      from_status: b.status,
      to_status: status,
      actor_role: actor.role,
      actor_user_id: actor.userId,
      reason,
    });
    if (status === 'completed') await this.afterCompleted(s, b);
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return row;
  }

  /**
   * Các việc phải chạy cùng transaction khi booking vừa completed (admin chốt,
   * khách xác nhận, job tự hoàn tất đều đi qua đây). Việc không cần cùng transaction
   * thì nghe event outbox `booking.completed` thay vì thêm vào đây.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking vừa completed
   */
  private async afterCompleted(s: EntityManager, b: BookingEntity) {
    await this.reviews.recalculate(s, b.photographer_id);
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
      items: await s.find(EntitySchemas.booking_status_history, {
        where: { booking_id: booking.id },
        order: { created_at: 'ASC' },
      }),
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
