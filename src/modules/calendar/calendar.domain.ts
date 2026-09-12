import { ensure } from '@shared/domain/domain.error';
import {
  interval,
  overlaps,
  utcDayInterval,
} from '@shared/domain/booking-values';
import { OCCUPIED_BOOKING_STATUSES } from '@shared/database/entities/booking.entity';

type Range = { from: string; to: string };
type CalendarBooking = Range & { status: string };

const isOccupied = (status: string): boolean =>
  (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);

/** Calendar rules calculated from persisted facts; no I/O or framework code. */
export class Calendar {
  static availability(
    from: string,
    to: string,
    offlineDates: readonly string[],
    bookings: readonly CalendarBooking[],
  ) {
    const range = interval(from, to);
    ensure(
      Date.parse(range.to) - Date.parse(range.from) <= 93 * 864e5,
      'Maximum availability window is 93 days',
    );
    const blockedDates = new Set(offlineDates);
    const blocks = bookings.filter((b) => isOccupied(b.status));
    const free: Range[] = [];
    const firstDay = new Date(range.from);
    firstDay.setUTCHours(0, 0, 0, 0);
    for (
      let day = firstDay.getTime();
      day < Date.parse(range.to);
      day += 864e5
    ) {
      if (blockedDates.has(new Date(day).toISOString().slice(0, 10))) continue;
      let parts: Range[] = [
        {
          from: new Date(Math.max(day, Date.parse(range.from))).toISOString(),
          to: new Date(
            Math.min(day + 864e5, Date.parse(range.to)),
          ).toISOString(),
        },
      ].filter((part) => part.from < part.to);
      for (const block of blocks)
        parts = parts.flatMap((part) =>
          !overlaps(part, block)
            ? [part]
            : [
                {
                  from: part.from,
                  to: new Date(
                    Math.min(Date.parse(part.to), Date.parse(block.from)),
                  ).toISOString(),
                },
                {
                  from: new Date(
                    Math.max(Date.parse(part.from), Date.parse(block.to)),
                  ).toISOString(),
                  to: part.to,
                },
              ].filter((candidate) => candidate.from < candidate.to),
        );
      free.push(...parts);
    }
    return free.sort((a, b) => a.from.localeCompare(b.from));
  }

  static assertCanBlock(
    date: string,
    bookings: readonly CalendarBooking[],
    alreadyBlocked: boolean,
    now: number,
  ) {
    ensure(
      date >= new Date(now).toISOString().slice(0, 10),
      'Blocked date must not be in the past',
    );
    const day = utcDayInterval(date);
    ensure(
      !bookings.some(
        (booking) => isOccupied(booking.status) && overlaps(booking, day),
      ),
      'Time is used by an existing booking',
      'conflict',
    );
    ensure(!alreadyBlocked, 'Date is already blocked', 'conflict');
  }
}
