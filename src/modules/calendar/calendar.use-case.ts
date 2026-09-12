import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import { photographer, required } from '@shared/common/access';
import { Calendar } from './calendar.domain';
import { ensure } from '@shared/platform/exceptions/domain.error';

/** Application use cases for photographer calendar operations. */
@Injectable()
export class CalendarUseCases {
  async availability(
    s: EntityManager,
    _a: Actor,
    input: Inputs.CalendarAvailabilityQueryInput,
  ) {
    const p = await required(s, 'photographers', input.id),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Photographer not found', 'missing');
    if (!p.is_available) return { items: [] };
    const start = input.from ?? new Date().toISOString();
    const end = input.to ?? new Date(Date.now() + 30 * 864e5).toISOString();
    const offlineDates = await s.findBy(EntitySchemas.offline_slots, {
      photographer_id: p.id,
    });
    const bookings = await s.findBy(EntitySchemas.bookings, {
      photographer_id: p.id,
    });
    return {
      items: Calendar.availability(
        start,
        end,
        offlineDates.map((slot) => slot.date),
        bookings,
      ),
    };
  }

  async me(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    return {
      blocked: await s.findBy(EntitySchemas.offline_slots, {
        photographer_id: p.id,
      }),
      bookings: await s.findBy(EntitySchemas.bookings, {
        photographer_id: p.id,
      }),
    };
  }

  async block(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockCommandInput,
  ) {
    const p = await photographer(s, a);
    const bookings = await s.findBy(EntitySchemas.bookings, {
      photographer_id: p.id,
    });
    const existing = await s.findBy(EntitySchemas.offline_slots, {
      photographer_id: p.id,
      date: input.date,
    });
    Calendar.assertCanBlock(
      input.date,
      bookings,
      existing.length > 0,
      Date.now(),
    );
    return s.save(EntitySchemas.offline_slots, {
      photographer_id: p.id,
      date: input.date,
      reason: input.reason ?? null,
    });
  }

  async unblock(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarUnblockCommandInput,
  ) {
    const p = await photographer(s, a),
      slot = await required(s, 'offline_slots', input.id);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await s.delete(EntitySchemas.offline_slots, slot.id);
    return { deleted: true };
  }
}
