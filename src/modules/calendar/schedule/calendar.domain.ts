import { ensure } from '@shared/domain/domain.error';
import { isOccupied } from '@shared/domain/rules/booking.rules';
import { interval, overlaps } from '@shared/domain/rules/time-range.rules';
import {
  WorkSchedule,
  vnDate,
  vnDayInterval,
} from '@shared/domain/rules/work-schedule.rules';
import type { WorkingShift } from '@shared/domain/types/work-schedule.types';

type Range = { from: string; to: string };
type CalendarBooking = Range & { status: string };

/** Default and maximum calendar window, in days. */
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 93;

/**
 * Subtract occupied segments from a time range.
 *
 * @param part Original time range.
 * @param blocks Occupied ranges (blocks and bookings).
 * @returns Remaining range, which may be empty or split into multiple segments.
 */
function subtract(part: Range, blocks: readonly Range[]): Range[] {
  let parts = [part];
  for (const block of blocks)
    parts = parts.flatMap((p) =>
      !overlaps(p, block)
        ? [p]
        : [clip(p, p.from, block.from), clip(p, block.to, p.to)].filter(
            (candidate) => candidate !== null,
          ),
    );
  return parts;
}

/**
 * Intersection of `range` with [from, to).
 *
 * @param range Original range in ISO UTC.
 * @param from Start time in ISO format in any time zone.
 * @param to Optional end time in ISO format.
 * @returns ISO UTC range, or `null` if no time remains.
 */
function clip(range: Range, from: string, to: string): Range | null {
  const start = Math.max(Date.parse(range.from), Date.parse(from)),
    end = Math.min(Date.parse(range.to), Date.parse(to));
  return start < end
    ? { from: new Date(start).toISOString(), to: new Date(end).toISOString() }
    : null;
}

/** Photographer calendar rules (availability, blocks, and viewing windows), computed from loaded data with no I/O. */
export class Calendar {
  /**
   * Customer availability window: cannot start in the past; if `to` is omitted, use 30 days after `from`.
   *
   * @param input Optional customer-provided `from` and `to` values.
   * @param now Current time in milliseconds.
   * @returns `{ from, to }` in ISO UTC; the 93-day limit is enforced by `availability`.
   */
  static availabilityWindow(
    input: { from?: string; to?: string },
    now: number,
  ) {
    const from = Math.max(input.from ? Date.parse(input.from) : now, now);
    return Calendar.window(from, input.to);
  }

  /**
   * Photographer’s own calendar window: past dates are allowed; defaults to the next 30 days and is limited to 93 days.
   *
   * @param input Optional photographer-provided `from` and `to` values.
   * @param now Current time in milliseconds.
   * @returns `{ from, to }` in ISO UTC; throws HTTP 400 if the range exceeds 93 days.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static personalWindow(input: { from?: string; to?: string }, now: number) {
    const range = Calendar.window(
      input.from ? Date.parse(input.from) : now,
      input.to,
    );
    ensure(
      Date.parse(range.to) - Date.parse(range.from) <= MAX_WINDOW_DAYS * 864e5,
      `Maximum window is ${MAX_WINDOW_DAYS} days`,
    );
    return range;
  }

  /**
   * Range starting at `from`; if `to` is omitted, use `DEFAULT_WINDOW_DAYS` days after `from`.
   *
   * @param from Start time in milliseconds.
   * @param to Optional ISO end time.
   * @returns `{ from, to }` in ISO UTC; throws HTTP 400 if `to` is not after `from`.
   */
  private static window(from: number, to: string | undefined) {
    return interval(
      new Date(from).toISOString(),
      to ?? new Date(from + DEFAULT_WINDOW_DAYS * 864e5).toISOString(),
    );
  }

  /**
   * Photographer availability in a range: apply working shifts in Vietnam time, then subtract blocked ranges and bookings occupying the schedule.
   *
   * @param from Start of the time range to view, in ISO format.
   * @param to End of the time range to view, in ISO format; at most 93 days after `from`.
   * @param schedule Photographer weekly schedule; an empty schedule uses the default 08:00–20:00 hours.
   * @param blockedTimes Photographer’s blocked time ranges.
   * @param bookings Photographer bookings; only statuses that occupy the schedule are subtracted.
   * @returns Available `{ from, to }` ranges in ISO UTC, ordered by time.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static availability(
    from: string,
    to: string,
    schedule: readonly WorkingShift[],
    blockedTimes: readonly Range[],
    bookings: readonly CalendarBooking[],
  ) {
    const range = interval(from, to);
    ensure(
      Date.parse(range.to) - Date.parse(range.from) <= MAX_WINDOW_DAYS * 864e5,
      `Maximum window is ${MAX_WINDOW_DAYS} days`,
    );
    const blocks: Range[] = [
      ...blockedTimes,
      ...bookings.filter((b) => isOccupied(b.status)),
    ];
    const free: Range[] = [];
    const lastDay = vnDate(new Date(Date.parse(range.to) - 1).toISOString());
    for (
      let day = vnDate(range.from);
      day <= lastDay;
      day = vnDate(vnDayInterval(day).to)
    )
      for (const shift of WorkSchedule.shifts(day, schedule)) {
        const part = clip(shift, range.from, range.to);
        if (part) free.push(...subtract(part, blocks));
      }
    return free;
  }

  /**
   * Time range the photographer wants to block: a full Vietnam-time day (`date`) or a `from`–`to` range that may span multiple days.
   *
   * @param input Supply either `date` or both `from` and `to`; do not mix the two formats.
   * @returns `{ from, to }` in ISO UTC; throws HTTP 400 if the input format is invalid or `from` is not before `to`.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static blockRange(input: { date?: string; from?: string; to?: string }) {
    const byDate = input.date !== undefined,
      byRange = input.from !== undefined || input.to !== undefined;
    ensure(byDate !== byRange, 'Send either date or from and to');
    if (byDate) {
      const date = input.date!;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      ensure(
        !Number.isNaN(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === date,
        'date must be a real calendar date (YYYY-MM-DD)',
      );
      return vnDayInterval(date);
    }
    ensure(input.from && input.to, 'Send both from and to');
    return interval(input.from, input.to);
  }

  /**
   * Validate a calendar block: it must not have ended, overlap a booking occupying the schedule, or overlap another block.
   *
   * @param range Time range to block, from `blockRange`.
   * @param bookings Photographer bookings.
   * @param blockedTimes Photographer’s blocked time ranges.
   * @param now Current time in milliseconds.
   * @returns Returns no value; throws HTTP 400 if the time has passed, or HTTP 409 if it overlaps a booking or another block.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static assertCanBlock(
    range: Range,
    bookings: readonly CalendarBooking[],
    blockedTimes: readonly Range[],
    now: number,
  ) {
    ensure(Date.parse(range.to) > now, 'Blocked time must not be in the past');
    ensure(
      !bookings.some(
        (booking) => isOccupied(booking.status) && overlaps(booking, range),
      ),
      'Time is used by an existing booking',
      'conflict',
    );
    ensure(
      !blockedTimes.some((blocked) => overlaps(blocked, range)),
      'Time is already blocked',
      'conflict',
    );
  }
}
