import type { EntityManager } from 'typeorm';
import { EntitySchemas, overlapWhere } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  photographer,
  publicPhotographer,
  required,
} from '@shared/common/access';
import { Calendar } from './calendar.domain';
import { PendingBookingsPort } from '../ports/pending-bookings.port';
import { PhotographerBookingsPort } from '../ports/photographer-bookings.port';
import { ensure } from '@shared/platform/exceptions/domain.error';

/** Reason recorded when a pending request is rejected because the photographer blocked that time. */
const BLOCKED_REASON = 'Photographer blocked this time';

/** Photographer calendar operations: blocks, my calendar, and customer availability. */
@Injectable()
export class CalendarUseCases {
  constructor(
    private readonly pendingBookings: PendingBookingsPort,
    private readonly bookings: PhotographerBookingsPort,
  ) {}

  /**
   * Public photographer availability: all time is available except blocked ranges and bookings reserving the schedule.
   * Only approved photographers with active accounts; return no availability when `is_available = false`.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param input Photographer profile ID; `from` and `to` default to now and 30 days from now.
   * @returns `{ items }` containing available `{ from, to }` ranges; throws HTTP 404 if the photographer is not public.
   */
  async availability(
    s: EntityManager,
    _a: Actor,
    input: Inputs.CalendarAvailabilityQueryInput,
  ) {
    const { photographer: p } = await publicPhotographer(
      s,
      input.photographer_id,
    );
    if (!p.is_available) return { items: [] };
    const window = Calendar.availabilityWindow(input, Date.now());
    return {
      items: Calendar.availability(
        window.from,
        window.to,
        await s.find(EntitySchemas.offline_slots, {
          where: overlapWhere(p.id, window),
          order: { from: 'ASC' as const },
        }),
        await this.bookings.bookingsOverlapping(s, p.id, window),
      ),
    };
  }

  /**
   * Public future offline slots for customer booking flows. Only public photographers are exposed;
   * the private reason is intentionally omitted from the response.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param input Photographer ID and optional future time window.
   * @returns `{ items }` containing future `{ id, from, to }` slots.
   */
  async futureOfflineSlots(
    s: EntityManager,
    _a: Actor,
    input: Inputs.CalendarOfflineSlotsQueryInput,
  ) {
    const { photographer: p } = await publicPhotographer(
      s,
      input.photographer_id,
    );
    if (!p.is_available) return { items: [] };

    const window = Calendar.futureOfflineSlotsWindow(input, Date.now());
    const slots = await s
      .createQueryBuilder(EntitySchemas.offline_slots, 'slot')
      .select('slot.id', 'id')
      .addSelect('slot.from', 'from')
      .addSelect('slot.to', 'to')
      .where('slot.photographer_id = :photographerId', {
        photographerId: p.id,
      })
      .andWhere('slot.from >= :from', { from: window.from })
      .andWhere('slot.from < :to', { to: window.to })
      .orderBy('slot.from', 'ASC')
      .getRawMany<{ id: string; from: string | Date; to: string | Date }>();

    return {
      items: slots.map(({ id, from, to }) => ({
        id,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      })),
    };
  }

  /**
   * Photographer views their calendar: blocked ranges and bookings, optionally filtered by time range.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input Viewing range in `from` and `to`; defaults to the next 30 days, up to 93 days, and may include the past.
   * @returns `{ blocked, bookings }` overlapping the viewing range, ordered by start time; throws HTTP 400 if the range exceeds 93 days.
   */
  async me(s: EntityManager, a: Actor, input: Inputs.CalendarMeQueryInput) {
    const p = await photographer(s, a);
    const window = Calendar.personalWindow(input, Date.now());
    const query = {
      where: overlapWhere(p.id, window),
      order: { from: 'ASC' as const },
    };
    return {
      blocked: await s.find(EntitySchemas.offline_slots, query),
      bookings: await this.bookings.bookingsOverlapping(s, p.id, window),
    };
  }

  /**
   * Photographer blocks a busy time: a full Vietnam-time day or a `from`–`to` range that may span multiple days.
   * Lock the photographer profile row to avoid racing with booking creation (booking creation also locks this row).
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * If pending requests overlap the range, the photographer must send `decline_pending: true` (preview with `blockPreview`);
   * those requests will then be rejected with a reason.
   *
   * @param input `date` or `from` plus `to`, with an optional `reason` and `decline_pending` flag.
   * @returns Blocked range just saved; throws HTTP 400 for an invalid or past range, or HTTP 409 if it overlaps a booking or another block.
   * or pending requests remain that the photographer has not agreed to reject.
   */
  async block(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockCommandInput,
  ) {
    const p = await this.lockedPhotographer(s, a);
    const range = Calendar.blockRange(input);
    Calendar.assertCanBlock(
      range,
      await this.bookings.bookingsOverlapping(s, p.id, range),
      await s.find(EntitySchemas.offline_slots, {
        where: overlapWhere(p.id, range),
        order: { from: 'ASC' as const },
      }),
      Date.now(),
    );
    const affected = await this.pendingBookings.pendingOverlapping(
      s,
      p.id,
      range,
    );
    this.assertConsent(affected.length, input.decline_pending);
    const slot = await s.save(EntitySchemas.offline_slots, {
      photographer_id: p.id,
      ...range,
      reason: input.reason ?? null,
    });
    await this.pendingBookings.decline(
      s,
      affected.map((b) => b.id),
      BLOCKED_REASON,
    );
    return slot;
  }

  /**
   * Preview the pending requests that would be rejected if the photographer blocks this range.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input `date` or `from` plus `to`, as for blocking a range.
   * @returns `{ items }` containing affected requests; throws HTTP 400 for an invalid range.
   */
  async blockPreview(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockPreviewQueryInput,
  ) {
    const p = await photographer(s, a);
    return {
      items: await this.pendingBookings.pendingOverlapping(
        s,
        p.id,
        Calendar.blockRange(input),
      ),
    };
  }

  /**
   * The signed-in photographer profile; lock the row to avoid racing with booking creation or acceptance
   * (the Booking module also locks this row).
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @returns Photographer profile.
   */
  private async lockedPhotographer(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    await s.findOne(EntitySchemas.photographers, {
      where: { id: p.id },
      lock: { mode: 'pessimistic_write' },
    });
    return p;
  }

  /**
   * The photographer must agree to reject pending customer requests before blocking their time.
   *
   * @param affected Number of affected pending requests.
   * @param declinePending Whether the photographer supplied `decline_pending: true`.
   * @returns Returns no value; throws HTTP 409 if requests are affected and the photographer has not agreed to reject them.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  private assertConsent(affected: number, declinePending: boolean | undefined) {
    ensure(
      affected === 0 || declinePending === true,
      `${affected} pending request(s) would be declined; send decline_pending: true to go ahead`,
      'conflict',
    );
  }

  /**
   * Photographer removes one of their own blocked ranges.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input Blocked range ID.
   * @returns `{ deleted: true }`; throws HTTP 403 if the block belongs to another photographer, or HTTP 404 if it does not exist.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async unblock(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarUnblockCommandInput,
  ) {
    const p = await photographer(s, a),
      slot = await required(s, 'offline_slots', input.offline_slot_id);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await s.delete(EntitySchemas.offline_slots, slot.id);
    return { deleted: true };
  }
}
