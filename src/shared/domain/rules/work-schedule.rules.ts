import { ensure } from '@shared/domain/domain.error';
import { interval } from './time-range.rules';
import { DEFAULT_WORKING_HOURS } from '@shared/domain/values/work-schedule.values';
import type { WorkingShift } from '@shared/domain/types/work-schedule.types';

/** Vietnam uses a fixed UTC+7 offset (no daylight saving time). */
const VN_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 864e5;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Shift end time: like `TIME`, with `24:00` allowed to represent the end of the day. */
const END_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

/**
 * A Vietnam-time calendar day as [00:00, 24:00) +07:00, returned as ISO UTC timestamps.
 *
 * @param date Date to process.
 * @returns Result returned by `interval`.
 */
export function vnDayInterval(date: string) {
  const from = Date.parse(`${date}T00:00:00.000Z`) - VN_OFFSET_MS;
  return interval(
    new Date(from).toISOString(),
    new Date(from + DAY_MS).toISOString(),
  );
}

/**
 * Vietnam-local date for a given instant.
 *
 * @param iso String value used by the operation: iso.
 * @returns Result returned by `slice`.
 */
export function vnDate(iso: string) {
  return new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Day of the week for a Vietnam-local date.
 *
 * @param date Date to process.
 * @returns Result of the operation described above.
 */
export function vnWeekday(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * ISO UTC timestamp for an HH:MM time on a Vietnam-local day.
 *
 * @param date Date to process.
 * @param time Time value used by the operation.
 * @returns Result returned by `toISOString`.
 */
function vnTime(date: string, time: string) {
  return new Date(Date.parse(`${date}T${time}:00+07:00`)).toISOString();
}

/** Photographer working-hours rules. */
export class WorkSchedule {
  /**
   * Calculate the working shifts that apply to the specified date.
   *
   * @param date Date to process.
   * @param schedule List of schedule to process.
   * @returns Result returned by `sort`.
   */
  static shifts(date: string, schedule: readonly WorkingShift[]) {
    const weekday = vnWeekday(date);
    return (schedule.length ? schedule : DEFAULT_WORKING_HOURS)
      .filter((shift) => shift.weekday === weekday)
      .map((shift) => ({
        from: vnTime(date, shift.start_time),
        to: vnTime(date, shift.end_time),
      }))
      .sort((x, y) => x.from.localeCompare(y.from));
  }

  /**
   * Check whether a time range fits entirely within the working schedule.
   *
   * @param range Value used by the operation: range.
   * @param schedule List of schedule to process.
   * @returns Result returned by `some`.
   */
  static fits(
    range: { from: string; to: string },
    schedule: readonly WorkingShift[],
  ) {
    const from = Date.parse(range.from),
      to = Date.parse(range.to);
    return WorkSchedule.shifts(vnDate(range.from), schedule).some(
      (shift) => from >= Date.parse(shift.from) && to <= Date.parse(shift.to),
    );
  }

  /**
   * Calculate the length of the longest working shift in the schedule.
   *
   * @param schedule List of schedule to process.
   * @returns Result returned by `max`.
   */
  static longestShiftMinutes(schedule: readonly WorkingShift[]) {
    const minutes = (time: string) =>
      Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    return Math.max(
      ...(schedule.length ? schedule : DEFAULT_WORKING_HOURS).map(
        (shift) => minutes(shift.end_time) - minutes(shift.start_time),
      ),
    );
  }

  /**
   * Check a condition and throw if it is invalid.
   *
   * @param schedule List of schedule to process.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertValid(schedule: readonly WorkingShift[]) {
    for (const shift of schedule) {
      ensure(
        Number.isInteger(shift.weekday) &&
          shift.weekday >= 1 &&
          shift.weekday <= 7,
        'weekday must be 1 (Monday) to 7 (Sunday)',
      );
      ensure(
        TIME.test(shift.start_time) && END_TIME.test(shift.end_time),
        'Times must use HH:MM (end may be 24:00)',
      );
      ensure(
        shift.start_time < shift.end_time,
        'start_time must be before end_time',
      );
    }
    for (const shift of schedule)
      ensure(
        !schedule.some(
          (other) =>
            other !== shift &&
            other.weekday === shift.weekday &&
            other.start_time < shift.end_time &&
            shift.start_time < other.end_time,
        ),
        'Shifts on the same weekday must not overlap',
      );
  }
}
