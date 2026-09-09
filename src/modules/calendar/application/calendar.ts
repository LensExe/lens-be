import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { photographer, required } from '@shared/common/access';
import { interval, overlaps } from '@modules/booking/domain/booking';
import { ensure } from '@shared/platform/exceptions/domain.error';

const occupied = ['pending', 'accepted', 'in_progress', 'shot', 'completed'];

@Injectable()
export class CalendarUseCases {
  async availability(
    s: Session,
    _a: Actor,
    input: { id: string; from?: string; to?: string },
  ) {
    const p = await required(s, 'photographers', input.id),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Photographer not found', 'missing');
    if (!p.is_available) return { items: [] };
    const start = input.from ?? new Date().toISOString(),
      end = input.to ?? new Date(Date.now() + 30 * 864e5).toISOString();
    const range = interval(start, end);
    ensure(
      Date.parse(end) - Date.parse(start) <= 93 * 864e5,
      'Maximum availability window is 93 days',
    );
    const blocks = [
      ...(await s.find('offline_slots', { photographer_id: p.id })),
      ...(await s.find('bookings', { photographer_id: p.id })).filter((b) =>
        occupied.includes(b.status),
      ),
    ];
    const free: { from: string; to: string }[] = [];
    for (const slot of await s.find('working_slots', {
      photographer_id: p.id,
    })) {
      let parts = [
        {
          from: new Date(
            Math.max(Date.parse(slot.from), Date.parse(start)),
          ).toISOString(),
          to: new Date(
            Math.min(Date.parse(slot.to), Date.parse(end)),
          ).toISOString(),
        },
      ].filter((x) => x.from < x.to);
      for (const block of blocks)
        parts = parts.flatMap((part) =>
          !overlaps(part, block)
            ? [part]
            : [
                { from: part.from, to: block.from },
                { from: block.to, to: part.to },
              ].filter((x) => x.from < x.to),
        );
      free.push(...parts);
    }
    return {
      items: free
        .filter((x) => overlaps(x, range))
        .sort((x, y) => x.from.localeCompare(y.from)),
    };
  }
  async me(s: Session, a: Actor) {
    const p = await photographer(s, a);
    return {
      availability: await s.find('working_slots', { photographer_id: p.id }),
      blocked: await s.find('offline_slots', { photographer_id: p.id }),
      bookings: await s.find('bookings', { photographer_id: p.id }),
    };
  }
  private async noBookings(
    s: Session,
    pid: string,
    range: { from: string; to: string },
  ) {
    ensure(
      !(await s.find('bookings', { photographer_id: pid })).some(
        (b) => occupied.includes(b.status) && overlaps(b, range),
      ),
      'Time is used by an existing booking',
      'conflict',
    );
  }
  async create(s: Session, a: Actor, input: { from: string; to: string }) {
    const p = await photographer(s, a),
      range = interval(input.from, input.to);
    ensure(Date.parse(range.from) > Date.now(), 'Slot must start in future');
    ensure(
      !(await s.find('working_slots', { photographer_id: p.id })).some((x) =>
        overlaps(x, range),
      ),
      'Availability overlaps another slot',
      'conflict',
    );
    return s.insert('working_slots', {
      ...range,
      photographer_id: p.id,
      day: new Date(range.from).getUTCDay() || 7,
      date: range.from.slice(0, 10),
    });
  }
  async update(
    s: Session,
    a: Actor,
    input: { slotId: string; from: string; to: string },
  ) {
    const p = await photographer(s, a),
      slot = await required(s, 'working_slots', input.slotId),
      range = interval(input.from, input.to);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await this.noBookings(s, p.id, slot);
    await this.noBookings(s, p.id, range);
    ensure(Date.parse(range.from) > Date.now(), 'Slot must start in future');
    ensure(
      !(await s.find('working_slots', { photographer_id: p.id })).some(
        (x) => x.id !== slot.id && overlaps(x, range),
      ),
      'Slot overlap',
      'conflict',
    );
    return s.update('working_slots', slot.id, {
      ...range,
      day: new Date(range.from).getUTCDay() || 7,
      date: range.from.slice(0, 10),
    });
  }
  async remove(s: Session, a: Actor, input: { slotId: string }) {
    const p = await photographer(s, a),
      slot = await required(s, 'working_slots', input.slotId);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await this.noBookings(s, p.id, slot);
    await s.delete('working_slots', slot.id);
    return { deleted: true };
  }
  async block(s: Session, a: Actor, input: { from: string; to: string }) {
    const p = await photographer(s, a),
      range = interval(input.from, input.to);
    await this.noBookings(s, p.id, range);
    return s.insert('offline_slots', {
      ...range,
      photographer_id: p.id,
      day: new Date(range.from).getUTCDay() || 7,
    });
  }
  async unblock(s: Session, a: Actor, input: { id: string }) {
    const p = await photographer(s, a),
      slot = await required(s, 'offline_slots', input.id);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await s.delete('offline_slots', slot.id);
    return { deleted: true };
  }
}
