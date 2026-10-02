import {
  In,
  type SelectQueryBuilder,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { EntitySchemas, overlapWhere, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable, Optional } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  photographer as ownPhotographer,
  publicPhotographer,
  required,
  bookingAccess,
  emit,
  paged,
  pageWindow,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { WorkSchedule } from '@shared/domain/rules/work-schedule.rules';
import type { WorkingShift } from '@shared/domain/types/work-schedule.types';
import { RatingUpdaterPort } from '../ports/rating-updater.port';
import { PaidAmountsPort } from '../ports/paid-amounts.port';
import { BookingPaymentSettlementPort } from '../ports/booking-payment-settlement.port';
import { BookingDisputeReportPort } from '../ports/booking-dispute-report.port';
import type { PendingBookingsPort } from '@modules/calendar/ports/pending-bookings.port';
import {
  Booking,
  BookingActorRole,
  BookingStatus,
  OCCUPIED_BOOKING_STATUSES,
  type BookingAction,
} from './booking.domain';
import {
  BookingCollaboratorStatus,
  Collaboration,
  type CollaborationAction,
} from '../collaborator/collaborator.domain';
import type {
  BookingCollaboratorEntity,
  BookingEntity,
} from '@shared/database/entities';

/** Bookings per page and maximum pages to scan per run of the due-booking job. */
const JOB_BATCH_SIZE = 100;
const JOB_MAX_PAGES = 10;

/** Reason recorded when a booking is cancelled because the customer did not pay the deposit in time. */
const UNPAID_REASON = 'Deposit not paid in time';

/** Reason recorded when a pending request expires because the photographer did not respond in time. */
const EXPIRED_REASON = 'Photographer did not respond in time';

/** Reason recorded when a pending request is automatically rejected because the photographer accepted an overlapping booking. */
const TURNED_DOWN_REASON = 'Photographer accepted another booking at this time';

/** Actor recorded in history; `userId` is `null` for a background job (`role = 'system'`). */
type HistoryActor = { role: BookingActorRole; userId: string | null };

/** Booking side that performed the action (not stored in the table: customer, photographer, or admin/system). */
const ACTION_SIDE: Partial<Record<BookingAction, 'customer' | 'photographer'>> =
  {
    reject: 'photographer',
    start: 'photographer',
    completeShoot: 'photographer',
    confirmReceipt: 'customer',
  };

import { CustomerBookingStatsPort } from '@modules/customer/ports/customer-booking-stats.port';

@Injectable()
export class BookingUseCases
  implements PendingBookingsPort, CustomerBookingStatsPort
{
  constructor(
    private readonly reviews: RatingUpdaterPort,
    private readonly payments: PaidAmountsPort,
    @Optional()
    private readonly disputeReports?: BookingDisputeReportPort,
    @Optional()
    private readonly paymentSettlement?: BookingPaymentSettlementPort,
  ) {}

  /**
   * Customer books a photographer using a plan. Lock the photographer row to avoid a race with the photographer accepting a booking
   * or blocking a time range (both operations read and reject overlapping pending requests).
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer actor; must have a customer profile.
   * @param input Photographer, plan, location, and `from`–`to` time range.
   * @returns Pending booking; throws 404 if the photographer is unapproved, 400 for an invalid duration, or 409 if outside working hours or overlapping.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async create(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCreateCommandInput,
  ) {
    role(a, 'customer');
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id });
    ensure(c, 'Customer profile required', 'forbidden');

    const p = await this.lockPhotographer(s, input.photographer_id);

    const pu = await required(s, 'users', p.user_id),
      plan = await required(s, 'booking_plans', input.plan_id);

    const schedule = await s.findBy(EntitySchemas.working_hours, {
      photographer_id: p.id,
    });

    const blockedTimes = await s.findBy(
      EntitySchemas.offline_slots,
      overlapWhere(p.id, input),
    );

    const bookings = await s.findBy(
      EntitySchemas.bookings,
      overlapWhere(p.id, input),
    );

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
      openRequestsWithPhotographer: await s.countBy(EntitySchemas.bookings, {
        customer_id: c.id,
        photographer_id: p.id,
        status: BookingStatus.PENDING,
      }),
      openRequests: await s.countBy(EntitySchemas.bookings, {
        customer_id: c.id,
        status: BookingStatus.PENDING,
      }),
      now: Date.now(),
    });

    const booking = await s.save(EntitySchemas.bookings, draft);
    await this.recordHistory(
      s,
      booking.id,
      null,
      booking.status,
      { role: BookingActorRole.CUSTOMER, userId: u.id },
      null,
    );
    await emit(s, 'booking.created', [u.id, p.user_id], {
      booking_id: booking.id,
      status: booking.status,
    });
    return booking;
  }

  /**
   * Booking details; visible to the customer, assigned photographer, and admin/system.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor
   * @param input ID booking
   * @returns Booking; throws 403 if the caller is unrelated, or 404 if it does not exist.
   */
  async get(s: EntityManager, a: Actor, input: Inputs.BookingGetQueryInput) {
    return this.viewable(s, a, input.id);
  }

  /**
   * My bookings: bookings where the user is the customer or primary photographer, newest first. Filter and paginate in SQL.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor
   * @param input Filters: `status`, `from` (inclusive start), `to` (exclusive end), `limit`, and `offset`.
   * @returns `{ items, total, offset, limit }`
   */
  async list(s: EntityManager, a: Actor, input: Inputs.BookingListQueryInput) {
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id }),
      [p] = await s.findBy(EntitySchemas.photographers, { user_id: u.id });
    const filters = {
      ...(input.status && { status: input.status }),
      ...(input.from && { from: MoreThanOrEqual(input.from) }),
      ...(input.to && { to: LessThanOrEqual(input.to) }),
    };
    const where = [
      ...(c ? [{ customer_id: c.id, ...filters }] : []),
      ...(p ? [{ photographer_id: p.id, ...filters }] : []),
    ];
    if (!where.length) return paged([], 0, input);
    return this.pageOfBookings(s, where, input);
  }

  /**
   * Booking statistics for a customer (used by the customer module).
   *
   * @param s EntityManager for the current transaction.
   * @param customerId Customer ID associated with the operation.
   * @returns Result object containing the fields `total`, `pending`, `completed`, `total_spent_vnd`.
   */
  async statsForCustomer(s: EntityManager, customerId: string) {
    const [total, pending, completed, bookings] = await Promise.all([
      s.countBy(EntitySchemas.bookings, { customer_id: customerId }),
      s.countBy(EntitySchemas.bookings, {
        customer_id: customerId,
        status: BookingStatus.PENDING,
      }),
      s.countBy(EntitySchemas.bookings, {
        customer_id: customerId,
        status: BookingStatus.COMPLETED,
      }),
      s.find(EntitySchemas.bookings, {
        where: { customer_id: customerId },
        select: { id: true },
      }),
    ]);
    const bookingIds = bookings.map((booking) => booking.id);
    const paid = bookingIds.length
      ? await this.payments.paidAmounts(s, bookingIds)
      : {};
    const total_spent_vnd = Object.values(paid).reduce((a, b) => a + b, 0);
    return { total, pending, completed, total_spent_vnd };
  }

  /**
   * Apply a user-requested booking transition after checking the caller’s permissions.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request.
   * @param input Booking ID and reason for rejection or cancellation.
   * @param action Action name in the state machine.
   * @returns Booking after the status change.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async transition(
    s: EntityManager,
    a: Actor,
    input: { id: string; reason?: string },
    action: BookingAction,
  ) {
    const side = ACTION_SIDE[action];
    if (action === 'complete') role(a, 'admin', 'system');
    const {
      booking: b,
      user,
      customer,
      photographer,
      recipients,
    } = await bookingAccess(s, a, input.id, side);
    const actorRole = Booking.actorRole(
      user.id,
      customer.user_id,
      photographer.user_id,
      a.roles,
    );
    // Regular cancellations are limited to the booking's customer or photographer; admins cancel through a separate admin route.
    if (action === 'cancel')
      ensure(
        actorRole === BookingActorRole.CUSTOMER ||
          actorRole === BookingActorRole.PHOTOGRAPHER,
        'Booking access denied',
        'forbidden',
      );
    return this.apply(
      s,
      b,
      action,
      { role: actorRole, userId: user.id },
      input.reason ?? null,
      recipients,
    );
  }

  /**
   * Apply an action to an authorized booking: validate the rules, save the status,
   * record history, run completion side effects, and emit real-time events. Shared by API requests and background jobs.
   * Throw HTTP 409 if another actor changed the booking status after it was read.
   *
   * @param s EntityManager for the current transaction.
   * @param b Booking to transition (already loaded).
   * @param action Action in the state machine.
   * @param actor Actor performing the operation; `userId` is `null` for background jobs (`role = 'system'`).
   * @param reason Reason for rejection, cancellation, or system action; `null` if none.
   * @param recipients Real-time event recipients (customer and photographer).
   * @returns Booking after the status change.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  private async apply(
    s: EntityManager,
    b: BookingEntity,
    action: BookingAction,
    actor: HistoryActor,
    reason: string | null,
    recipients: string[],
  ) {
    const row = await this.tryApply(s, b, action, actor, reason, recipients);
    ensure(
      row,
      'Booking was changed by someone else, reload and try again',
      'conflict',
    );
    return row;
  }

  /**
   * Like `apply`, but return `null` instead of throwing if the booking status changed after it was read.
   * Used for bulk operations (jobs and rejecting overlapping pending requests) to skip a row that has just changed.
   * The UPDATE includes the previous status in its condition so concurrent operations cannot overwrite each other.
   *
   * @param s EntityManager for the current transaction.
   * @param b Booking to transition (already loaded).
   * @param action Action in the state machine.
   * @param actor Actor performing the operation.
   * @param reason Reason for the operation; `null` if none.
   * @param recipients Real-time event recipients.
   * @returns Booking after the status change, or `null` if its status changed since it was read.
   */
  private async tryApply(
    s: EntityManager,
    b: BookingEntity,
    action: BookingAction,
    actor: HistoryActor,
    reason: string | null,
    recipients: string[],
  ) {
    const status = new Booking(b.status).transition(action, {
      paidAmount: Booking.needsPayment(action)
        ? (await this.payments.paidAmounts(s, [b.id]))[b.id]
        : 0,
      depositAmount: Number(b.deposit_amount),
      totalAmount: Number(b.total_amount),
      galleryPublished: !!b.gallery_published_at,
    });
    const updatedAt = new Date().toISOString();
    const { affected } = await s.update(
      EntitySchemas.bookings,
      { id: b.id, status: b.status },
      {
        status,
        updated_at: updatedAt,
        ...(status === BookingStatus.ACCEPTED && { accepted_at: updatedAt }),
      },
    );
    if (affected !== 1) return null;
    await this.recordHistory(s, b.id, b.status, status, actor, reason);
    if (status === BookingStatus.COMPLETED) {
      await this.afterCompleted(s, b);
      await this.paymentSettlement?.scheduleBookingEscrowRelease(
        s,
        b.id,
        updatedAt,
      );
    }
    const terminalRefundStatuses: string[] = [
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED,
      BookingStatus.EXPIRED,
    ];
    if (terminalRefundStatuses.includes(status))
      await this.paymentSettlement?.requestCancellationRefunds(
        s,
        b.id,
        actor.userId,
        reason,
      );
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return {
      ...b,
      status,
      updated_at: updatedAt,
      ...(status === BookingStatus.ACCEPTED && { accepted_at: updatedAt }),
    };
  }

  /**
   * Write one booking status history row.
   *
   * @param s EntityManager for the current transaction.
   * @param bookingId ID booking
   * @param from Previous status; `null` when the booking is created.
   * @param to Next status.
   * @param actor Actor performing the operation; `userId` is `null` for a background job.
   * @param reason Reason for rejection or cancellation; `null` if none.
   * @returns No value is returned.
   */
  private async recordHistory(
    s: EntityManager,
    bookingId: string,
    from: BookingStatus | null,
    to: BookingStatus,
    actor: HistoryActor,
    reason: string | null,
  ) {
    await s.save(EntitySchemas.booking_status_history, {
      booking_id: bookingId,
      from_status: from,
      to_status: to,
      actor_role: actor.role,
      actor_user_id: actor.userId,
      reason,
    });
  }

  /**
   * Lock the photographer row until the transaction ends so schedule and statistics updates for the same photographer run sequentially.
   * Use `FOR NO KEY UPDATE`: it blocks concurrent updates like `FOR UPDATE` but allows other transactions to insert rows
   * referencing the photographer (bookings and reviews), since those operations do not change the photographer key.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Locked photographer profile; throws 404 if it does not exist.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  private async lockPhotographer(s: EntityManager, photographerId: string) {
    const p = await s.findOne(EntitySchemas.photographers, {
      where: { id: photographerId },
      lock: { mode: 'for_no_key_update' },
    });
    ensure(p, 'photographers not found', 'missing');
    return p;
  }

  /**
   * Operations that must share a transaction when a booking completes (admin completion,
   * customer confirmation, and auto-completion all run through this path). For work that does not need the same transaction,
   * listen for the `booking.completed` outbox event instead of adding it here.
   *
   * @param s EntityManager for the current transaction.
   * @param b Booking that has just been completed.
   * @returns No value is returned.
   */
  private async afterCompleted(s: EntityManager, b: BookingEntity) {
    // Lock the photographer row so simultaneous completions of two bookings do not undercount.
    await this.lockPhotographer(s, b.photographer_id);
    await this.reviews.recordBookingStats(
      s,
      b.photographer_id,
      await this.completionStats(s, b.photographer_id),
    );
  }

  /**
   * Number of completed photographer bookings and customers with at least two completed bookings (repeat customers).
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns `{ completedBookings, returnCustomers }`
   */
  private async completionStats(s: EntityManager, photographerId: string) {
    const completedBookings = await s.countBy(EntitySchemas.bookings, {
      photographer_id: photographerId,
      status: BookingStatus.COMPLETED,
    });
    const row = await s
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(
        (sub) =>
          sub
            .select('b.customer_id')
            .from(EntitySchemas.bookings, 'b')
            .where('b.photographer_id = :photographerId', { photographerId })
            .andWhere('b.status = :status', {
              status: BookingStatus.COMPLETED,
            })
            .groupBy('b.customer_id')
            .having('COUNT(*) > 1'),
        'returning',
      )
      .getRawOne<{ count: string }>();
    return { completedBookings, returnCustomers: Number(row?.count ?? 0) };
  }

  /**
   * Primary photographer accepts a booking: `pending → accepted`. Recheck that no accepted booking
   * or a blocked range occupies the time; then reject overlapping pending requests with a reason and send a real-time notification.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer actor.
   * @param i ID booking
   * @returns Booking after the status change; throws 409 if the status is invalid or the time is already held.
   */
  async accept(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingAcceptCommandInput,
  ) {
    const access = await bookingAccess(s, a, i.id, 'photographer');
    // Lock the photographer so overlapping acceptances cannot both succeed; reread the booking after acquiring the lock.
    await this.lockPhotographer(s, access.photographer.id);
    const b = await required(s, 'bookings', i.id);
    if (b.status === BookingStatus.PENDING)
      Booking.assertStillPending(b, Date.now());
    const overlap = overlapWhere(b.photographer_id, b);
    const others = (await s.findBy(EntitySchemas.bookings, overlap)).filter(
      (o) => o.id !== b.id,
    );
    Booking.assertCanAccept(
      b,
      await s.findBy(EntitySchemas.offline_slots, overlap),
      others,
    );
    const row = await this.apply(
      s,
      b,
      'accept',
      {
        role: Booking.actorRole(
          access.user.id,
          access.customer.user_id,
          access.photographer.user_id,
          a.roles,
        ),
        userId: access.user.id,
      },
      null,
      access.recipients,
    );
    await this.turnDownOverlapping(s, b.photographer_id, b, TURNED_DOWN_REASON);
    return row;
  }

  /**
   * Reject all of the photographer’s pending bookings that overlap a time range (system action with a reason).
   * Used when a photographer accepts a booking.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param range Time range that was just held.
   * @param reason Reason to record in the history.
   * @returns Number of requests rejected.
   */
  private async turnDownOverlapping(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
    reason: string,
  ) {
    const pending = await this.pendingOverlapping(s, photographerId, range);
    return this.decline(
      s,
      pending.map((b) => b.id),
      reason,
    );
  }

  /**
   * Pending requests that overlap a time range (shown when the photographer previews a calendar block).
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param range Time range about to be blocked.
   * @returns Affected requests, ordered by start time.
   */
  pendingOverlapping(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ) {
    return s.find(EntitySchemas.bookings, {
      where: {
        ...overlapWhere(photographerId, range),
        status: BookingStatus.PENDING,
      },
      order: { from: 'ASC' },
    });
  }

  /**
   * Pending requests that no longer fit within a shift in the new weekly schedule
   * (shown when the photographer previews a schedule change).
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param schedule New weekly schedule; an empty schedule uses the default hours.
   * @returns Affected requests, ordered by start time.
   */
  async pendingOutside(
    s: EntityManager,
    photographerId: string,
    schedule: readonly WorkingShift[],
  ) {
    return (
      await s.find(EntitySchemas.bookings, {
        where: {
          photographer_id: photographerId,
          status: BookingStatus.PENDING,
        },
        order: { from: 'ASC' },
      })
    ).filter((b) => !WorkSchedule.fits(b, schedule));
  }

  /**
   * Reject all remaining `pending` requests as a system action, with a reason, history entry, and real-time notification.
   * Skip a request if it was answered in the meantime.
   *
   * @param s EntityManager for the current transaction.
   * @param bookingIds IDs of requests to reject.
   * @param reason Reason to record in the history.
   * @returns Number of requests rejected.
   */
  async decline(
    s: EntityManager,
    bookingIds: readonly string[],
    reason: string,
  ) {
    if (!bookingIds.length) return 0;
    const pending = await s.findBy(EntitySchemas.bookings, {
      id: In([...bookingIds]),
      status: BookingStatus.PENDING,
    });
    let declined = 0;
    for (const b of pending)
      if (
        await this.tryApply(
          s,
          b,
          'reject',
          { role: BookingActorRole.SYSTEM, userId: null },
          reason,
          await this.recipients(s, b),
        )
      )
        declined++;
    return declined;
  }

  /**
   * Primary photographer rejects a booking with a reason: `pending → rejected`.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer actor.
   * @param i Booking ID and reason.
   * @returns Booking after the status change; throws 409 if the status is invalid.
   */
  reject(s: EntityManager, a: Actor, i: Inputs.BookingRejectCommandInput) {
    return this.transition(s, a, i, 'reject');
  }

  /**
   * Customer or primary photographer cancels a booking with a reason: `pending | accepted → cancelled`.
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer or photographer actor for the booking.
   * @param i Booking ID and reason.
   * @returns Booking after the status change; throws 409 if the status is invalid.
   */
  cancel(s: EntityManager, a: Actor, i: Inputs.BookingCancelCommandInput) {
    return this.transition(s, a, i, 'cancel');
  }

  /**
   * Primary photographer starts a photo shoot: `accepted → in_progress`; the deposit must be fully paid.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer actor.
   * @param i ID booking
   * @returns Booking after the status change; throws 409 if the status is invalid or the deposit has not been paid.
   */
  start(s: EntityManager, a: Actor, i: Inputs.BookingStartCommandInput) {
    return this.transition(s, a, i, 'start');
  }

  /**
   * Primary photographer marks the shoot as complete: `in_progress → shot`.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer actor.
   * @param i ID booking
   * @returns Booking after the status change; throws 409 if the status is invalid.
   */
  completeShoot(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCompleteShootCommandInput,
  ) {
    return this.transition(s, a, i, 'completeShoot');
  }

  /**
   * Admin/system completes the booking: `shot → completed`; full payment is required and the gallery must be published.
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin or system actor.
   * @param i ID booking
   * @returns Booking after the status change; throws 409 if the status is invalid or its prerequisites are not met.
   */
  complete(s: EntityManager, a: Actor, i: Inputs.BookingCompleteCommandInput) {
    return this.transition(s, a, i, 'complete');
  }

  /**
   * Customer confirms receipt of the photos for the booking: `shot → completed`, subject to the same conditions as `complete`
   * (full payment and a published gallery).
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer actor for the booking; other callers receive 403.
   * @param i ID booking
   * @returns Booking after completion; throws 409 if the status is invalid or its prerequisites are not met.
   */
  confirmReceipt(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingConfirmReceiptCommandInput,
  ) {
    return this.transition(s, a, i, 'confirmReceipt');
  }

  /**
   * Background job (`system` role) auto-completes `shot` bookings whose gallery has been published for at least 7 days and whose customer
   * has not confirmed receipt. Skip bookings without full payment (query the payment port) and check them again on the next run.
   * Idempotent: once completed, the booking is no longer `shot`, so rerunning the job has no effect.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have the `system` role.
   * @returns `{ checked, completed }`: number of due bookings checked and number completed.
   */
  async autoComplete(s: EntityManager, a: Actor) {
    role(a, 'system');
    const cutoff = Booking.autoCompleteCutoff(Date.now());
    let checked = 0,
      completed = 0;
    await this.inDuePages(
      s,
      (qb) =>
        qb
          .where('b.status = :status', { status: BookingStatus.SHOT })
          .andWhere('b.gallery_published_at <= :cutoff', { cutoff }),
      'gallery_published_at',
      async (page, paid) => {
        for (const b of page) {
          checked++;
          if (paid[b.id] < Number(b.total_amount)) continue;
          if (
            await this.tryApply(
              s,
              b,
              'complete',
              { role: BookingActorRole.SYSTEM, userId: null },
              null,
              await this.recipients(s, b),
            )
          )
            completed++;
        }
      },
    );
    return { checked, completed };
  }

  /**
   * Customer and primary photographer user IDs (real-time event recipients).
   *
   * @param s EntityManager for the current transaction.
   * @param b Booking
   * @returns `[customerUserId, photographerUserId]`
   */
  private async recipients(s: EntityManager, b: BookingEntity) {
    const customer = await required(s, 'customers', b.customer_id),
      photographer = await required(s, 'photographers', b.photographer_id);
    return [customer.user_id, photographer.user_id];
  }

  /**
   * Background job (`system` role) expires pending requests the photographer has not answered, at the earlier of
   * 24 hours after submission or the photo shoot start time. Idempotent: once expired, the booking is no longer
   * `pending`, so rerunning the job has no effect.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have the `system` role.
   * @returns `{ expired }`: number of requests that just expired.
   */
  async expirePending(s: EntityManager, a: Actor) {
    role(a, 'system');
    const now = Date.now();
    const due = await s.find(EntitySchemas.bookings, {
      where: [
        {
          status: BookingStatus.PENDING,
          created_at: LessThanOrEqual(Booking.pendingExpiryCutoff(now)),
        },
        {
          status: BookingStatus.PENDING,
          from: LessThanOrEqual(new Date(now).toISOString()),
        },
      ],
      order: { created_at: 'ASC', id: 'ASC' },
      take: JOB_BATCH_SIZE,
      lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
    });
    let expired = 0;
    for (const b of due)
      if (
        await this.tryApply(
          s,
          b,
          'expire',
          { role: BookingActorRole.SYSTEM, userId: null },
          EXPIRED_REASON,
          await this.recipients(s, b),
        )
      )
        expired++;
    return { expired };
  }

  /**
   * Background job (`system` role) cancels accepted bookings whose customers have not paid the full deposit, at the earlier of
   * 24 hours after acceptance or the photo shoot start time. Release the photographer’s schedule.
   * Idempotent: once cancelled, the booking is no longer `accepted`, so rerunning the job has no effect.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have the `system` role.
   * @returns `{ cancelled }`: number of bookings just cancelled.
   */
  async cancelUnpaid(s: EntityManager, a: Actor) {
    role(a, 'system');
    const now = Date.now();
    let cancelled = 0;
    await this.inDuePages(
      s,
      (qb) =>
        qb
          .where('b.status = :status', { status: BookingStatus.ACCEPTED })
          .andWhere('(b.accepted_at <= :cutoff OR b."from" <= :now)', {
            cutoff: Booking.paymentDueCutoff(now),
            now: new Date(now).toISOString(),
          }),
      'accepted_at',
      async (page, paid) => {
        for (const b of page) {
          if (paid[b.id] >= Number(b.deposit_amount)) continue;
          if (
            await this.tryApply(
              s,
              b,
              'cancel',
              { role: BookingActorRole.SYSTEM, userId: null },
              UNPAID_REASON,
              await this.recipients(s, b),
            )
          )
            cancelled++;
        }
      },
    );
    return { cancelled };
  }

  /**
   * Process due bookings page by page, locking rows and skipping locked rows. Query the payment amount
   * for the entire page in one call. Scan all due bookings, not just the first page,
   * so an underpaid booking does not block later bookings; scan at most `JOB_MAX_PAGES` pages per run.
   *
   * @param s EntityManager for the current transaction.
   * @param filter Due-time condition on alias `b`.
   * @param orderField Time column used for ordering and pagination; include `id` for stable ordering.
   * @param visit Process one page, with a map from booking ID to amount paid.
   * @returns No value is returned.
   */
  private async inDuePages(
    s: EntityManager,
    filter: (
      qb: SelectQueryBuilder<BookingEntity>,
    ) => SelectQueryBuilder<BookingEntity>,
    orderField: 'gallery_published_at' | 'accepted_at',
    visit: (
      page: BookingEntity[],
      paid: Record<string, number>,
    ) => Promise<void>,
  ) {
    let cursor: { at: string; id: string } | null = null;
    for (let pageNo = 0; pageNo < JOB_MAX_PAGES; pageNo++) {
      const qb = filter(s.createQueryBuilder(EntitySchemas.bookings, 'b'));
      if (cursor) qb.andWhere(`(b.${orderField}, b.id) > (:at, :id)`, cursor);
      const page = await qb
        .orderBy(`b.${orderField}`, 'ASC')
        .addOrderBy('b.id', 'ASC')
        .limit(JOB_BATCH_SIZE)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
      if (!page.length) return;
      await visit(
        page,
        await this.payments.paidAmounts(
          s,
          page.map((b) => b.id),
        ),
      );
      if (page.length < JOB_BATCH_SIZE) return;
      const last = page[page.length - 1];
      cursor = { at: last[orderField]!, id: last.id };
    }
  }

  /**
   * Legacy collaboration workflow, retained for a possible later re-enable.
   * It is currently disabled and its CQRS handlers are not registered.
   * Primary photographer invites another photographer to collaborate. Lock the booking first so concurrent invitations
   * cannot exceed a combined 100% share.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer for the booking.
   * @param input Booking ID, invited photographer, and share percentage.
   * @returns Invitation just created.
   */
  async inviteCollaborator(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorInviteCommandInput,
  ) {
    role(a, 'photographer');
    await s.findOne(EntitySchemas.bookings, {
      where: { id: input.id },
      lock: { mode: 'pessimistic_write' },
    });
    const {
      booking: b,
      customer,
      photographer: owner,
    } = await bookingAccess(s, a, input.id, 'photographer');
    // Invite only approved photographers with active accounts; otherwise return 404.
    const { photographer: invitee } = await publicPhotographer(
      s,
      input.photographer_id,
    );
    const draft = Collaboration.invite({
      bookingStatus: b.status,
      galleryPublished: !!b.gallery_published_at,
      ownerPhotographerId: owner.id,
      inviteePhotographerId: invitee.id,
      sharePercent: input.share_percent,
      inviteeIsCustomer: invitee.user_id === customer.user_id,
      existing: await s.findBy(EntitySchemas.booking_collaborators, {
        booking_id: b.id,
      }),
    });
    const row = await s.save(EntitySchemas.booking_collaborators, {
      booking_id: b.id,
      ...draft,
      responded_at: null,
    });
    await emit(s, 'booking.collaborator_invited', [invitee.user_id], {
      booking_id: b.id,
      collaborator_id: row.id,
      share_percent: row.share_percent,
    });
    return row;
  }

  /**
   * Booking collaborators in every status, ordered by invitation time.
   * Visible to the customer, primary photographer, admin, and photographers invited to this booking.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor
   * @param input ID booking
   * @returns `{ items }`
   */
  async collaborators(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorListQueryInput,
  ) {
    const b = await this.viewable(s, a, input.id);
    return {
      items: await s.find(EntitySchemas.booking_collaborators, {
        where: { booking_id: b.id },
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Booking visible to the actor: customer, primary photographer, or admin/system. Each booking has a single photographer.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor
   * @param id ID booking
   * @returns Booking; throws 403 if the caller is unrelated, or 404 if it does not exist.
   */
  private async viewable(s: EntityManager, a: Actor, id: string) {
    const { booking } = await bookingAccess(s, a, id);
    return booking;
  }

  /**
   * Invitations sent to the signed-in photographer, newest first, with SQL pagination.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer actor.
   * @param input `limit`, `offset`
   * @returns `{ items, total, offset, limit }`
   */
  async myCollaborations(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorMeQueryInput,
  ) {
    role(a, 'photographer');
    const p = await ownPhotographer(s, a);
    const { offset, limit } = pageWindow(input);
    const [items, total] = await s.findAndCount(
      EntitySchemas.booking_collaborators,
      {
        where: { photographer_id: p.id },
        order: { created_at: 'DESC', id: 'ASC' },
        skip: offset,
        take: limit,
      },
    );
    return paged(items, total, input);
  }

  /**
   * Invitee accepts or declines a pending invitation; notify the primary photographer.
   *
   * @param s EntityManager for the current transaction.
   * @param a Invited photographer actor.
   * @param id Invitation ID.
   * @param action 'accept' | 'decline'
   * @returns Invitation after the status change.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async respondCollaboration(
    s: EntityManager,
    a: Actor,
    id: string,
    action: 'accept' | 'decline',
  ) {
    const { invitation, booking, me } = await this.invitation(s, a, id);
    ensure(
      invitation.photographer_id === me.id,
      'Invitation access denied',
      'forbidden',
    );
    if (action === 'accept') await this.assertCanJoin(s, me.id, booking);
    const owner = await required(s, 'photographers', booking.photographer_id);
    return this.changeCollaboration(
      s,
      invitation,
      booking,
      action,
      owner.user_id,
    );
  }

  /**
   * A collaborating photographer can accept only if the shoot time is available in their own calendar: no blocked range,
   * booking occupying the schedule, or other accepted collaboration may overlap it. Lock the photographer row
   * to avoid a race with accepting another booking or blocking the same time.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Profile ID of the invited photographer.
   * @param booking Booking for which the invitation was sent.
   * @returns Returns no value; throws HTTP 409 if the time conflicts.
   */
  private async assertCanJoin(
    s: EntityManager,
    photographerId: string,
    booking: BookingEntity,
  ) {
    await this.lockPhotographer(s, photographerId);
    const overlap = overlapWhere(photographerId, booking);
    Booking.assertCanAccept(
      booking,
      await s.findBy(EntitySchemas.offline_slots, overlap),
      await s.findBy(EntitySchemas.bookings, overlap),
    );
  }

  /**
   * Legacy collaboration calendar query retained in case collaboration is restored.
   * The Calendar module and primary booking flows do not currently use this result.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param range Time range to check.
   * @returns `{ from, to, status }` ranges for bookings the photographer is participating in.
   */
  async collaborationTimes(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ) {
    const joined = await s.findBy(EntitySchemas.booking_collaborators, {
      photographer_id: photographerId,
      status: BookingCollaboratorStatus.ACCEPTED,
    });
    if (!joined.length) return [];
    return s.findBy(EntitySchemas.bookings, {
      id: In(joined.map((c) => c.booking_id)),
      status: In([...OCCUPIED_BOOKING_STATUSES]),
      to: MoreThan(new Date(range.from).toISOString()),
      from: LessThan(new Date(range.to).toISOString()),
    });
  }

  /**
   * Primary photographer withdraws a pending invitation (before the invitee responds); notify the invitee.
   *
   * @param s EntityManager for the current transaction.
   * @param a Primary photographer actor.
   * @param i Invitation ID.
   * @returns Invitation after the status change.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async revokeCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorRevokeCommandInput,
  ) {
    const { invitation, booking, me } = await this.invitation(s, a, i.id);
    ensure(
      booking.photographer_id === me.id,
      'Invitation access denied',
      'forbidden',
    );
    const invitee = await required(
      s,
      'photographers',
      invitation.photographer_id,
    );
    return this.changeCollaboration(
      s,
      invitation,
      booking,
      'revoke',
      invitee.user_id,
    );
  }

  /**
   * Invitee accepts a pending invitation.
   *
   * @param s EntityManager for the current transaction.
   * @param a Invited photographer actor; other callers receive 403.
   * @param i Invitation ID.
   * @returns Invitation with `status = 'accepted'`; throws 409 if the invitation is no longer pending or the booking is closed.
   */
  acceptCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorAcceptCommandInput,
  ) {
    return this.respondCollaboration(s, a, i.id, 'accept');
  }

  /**
   * Invitee declines a pending invitation; the primary photographer cannot invite this photographer again afterward.
   *
   * @param s EntityManager for the current transaction.
   * @param a Invited photographer actor; other callers receive 403.
   * @param i Invitation ID.
   * @returns Invitation with `status = 'declined'`; throws 409 if the invitation is no longer pending or the booking is closed.
   */
  declineCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorDeclineCommandInput,
  ) {
    return this.respondCollaboration(s, a, i.id, 'decline');
  }

  /**
   * The invitation, its booking, and the signed-in photographer profile. Lock the booking before the invitation
   * (in the same order as the invite operation) so responding cannot race with booking cancellation or another invitation.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer actor.
   * @param id Invitation ID.
   * @returns `{ invitation, booking, me }`
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  private async invitation(s: EntityManager, a: Actor, id: string) {
    role(a, 'photographer');
    const me = await ownPhotographer(s, a);
    const { booking_id } = await required(s, 'booking_collaborators', id);
    const booking = await s.findOne(EntitySchemas.bookings, {
      where: { id: booking_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'bookings not found', 'missing');
    const invitation = await s.findOne(EntitySchemas.booking_collaborators, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(invitation, 'booking_collaborators not found', 'missing');
    return { invitation, booking, me };
  }

  /**
   * Apply the domain invitation transition, save it, and emit a real-time event.
   *
   * @param s EntityManager for the current transaction.
   * @param invitation Invitation.
   * @param booking Booking associated with the invitation.
   * @param action 'accept' | 'decline' | 'revoke'
   * @param notifyUserId User to notify through a real-time event.
   * @returns Invitation after the status change.
   */
  private async changeCollaboration(
    s: EntityManager,
    invitation: BookingCollaboratorEntity,
    booking: BookingEntity,
    action: CollaborationAction,
    notifyUserId: string,
  ) {
    const status = Collaboration.respond(invitation.status, action, {
      bookingStatus: booking.status,
      galleryPublished: !!booking.gallery_published_at,
    });
    const row = await updateEntity(
      s,
      EntitySchemas.booking_collaborators,
      invitation.id,
      {
        status,
        responded_at: action === 'revoke' ? null : new Date().toISOString(),
      },
    );
    await emit(s, `booking.collaborator_${status}`, [notifyUserId], {
      booking_id: booking.id,
      collaborator_id: invitation.id,
      status,
    });
    return row;
  }

  /**
   * Photographer bookings in every status that overlap a time range, ordered by start time. The Calendar module calls
   * through this port to build availability, the photographer calendar, and block checks instead of reading the `bookings` table directly.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param window Optional ISO `from` and `to` values; either may be supplied independently.
   * @returns Bookings that overlap the time range.
   */
  bookingsOverlapping(
    s: EntityManager,
    photographerId: string,
    window: { from?: string; to?: string },
  ) {
    return s.find(EntitySchemas.bookings, {
      where: overlapWhere(photographerId, window),
      order: { from: 'ASC' },
    });
  }

  /**
   * Number of bookings using a plan, in any status. The Photographer module calls through this port to prevent
   * deleting a plan that already has bookings.
   *
   * @param s EntityManager for the current transaction.
   * @param planId Booking plan ID.
   * @returns Number of bookings.
   */
  bookingCountForPlan(s: EntityManager, planId: string) {
    return s.countBy(EntitySchemas.bookings, { booking_plan_id: planId });
  }

  /**
   * Admin cancels any unfinished booking (pending, accepted, in progress, or shot); a reason is required.
   * Use for interventions such as when a photographer’s account is suspended mid-booking. Refund processing is handled by the Payment module.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor (admin)
   * @param i Booking ID and reason.
   * @returns Cancelled booking; throws HTTP 409 if it has already ended (`completed`, `rejected`, `cancelled`, or `expired`).
   */
  async adminCancel(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingAdminCancelCommandInput,
  ) {
    role(a, 'admin');
    const user = await currentUser(s, a),
      b = await required(s, 'bookings', i.id);
    return this.apply(
      s,
      b,
      'adminCancel',
      { role: BookingActorRole.ADMIN, userId: user.id },
      i.reason,
      await this.recipients(s, b),
    );
  }

  /**
   * Booking status history ordered by time.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor for the customer, assigned photographer, or administrator.
   * @param i ID booking
   * @returns `{ items }` containing booking history rows, oldest first.
   */
  async timeline(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingTimelineQueryInput,
  ) {
    const booking = await this.viewable(s, a, i.id);
    return {
      items: await s.find(EntitySchemas.booking_status_history, {
        where: { booking_id: booking.id },
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Customer or primary photographer reports a booking: create a report with `target_type = booking`.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor associated with the booking.
   * @param input Booking ID and reason.
   * @returns Report just created.
   */
  async dispute(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingDisputeCommandInput,
  ) {
    const { user } = await bookingAccess(s, a, input.id);
    ensure(
      this.disputeReports,
      'Booking dispute reporting is unavailable',
      'unavailable',
    );
    return this.disputeReports.createBookingDispute(s, {
      user_id: user.id,
      booking_id: input.id,
      reason: input.reason,
    });
  }

  /**
   * Admin booking list, newest first, with status filters. Filter and paginate in SQL.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor (admin)
   * @param input Filters: `status`, `limit`, and `offset`.
   * @returns `{ items, total, offset, limit }`
   */
  async admin(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingAdminQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return this.pageOfBookings(
      s,
      input.status ? { status: input.status } : {},
      input,
    );
  }

  /**
   * One page of bookings matching the filters, newest first; the database returns only the requested page size.
   *
   * @param s EntityManager for the current transaction.
   * @param where TypeORM `where` condition; an array represents OR.
   * @param query `limit` and `offset` from the query; default to 20 and 0.
   * @returns `{ items, total, offset, limit }`
   */
  private async pageOfBookings(
    s: EntityManager,
    where: FindOptionsWhere<BookingEntity> | FindOptionsWhere<BookingEntity>[],
    query: { limit?: number; offset?: number },
  ) {
    const { offset, limit } = pageWindow(query);
    const [items, total] = await s.findAndCount(EntitySchemas.bookings, {
      where,
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(items, total, query);
  }
}
