import { ensure } from '@shared/domain/domain.error';
import type { TimeRange } from '@shared/domain/types/time-range.types';

/**
 * Normalize a UTC half-open time interval [from, to).
 *
 * @param from Start of the time range.
 * @param to End of the time range.
 * @returns Result object containing the fields `from`, `to`.
 * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
 */
export function interval(from: string, to: string): TimeRange {
  const start = Date.parse(from);
  const end = Date.parse(to);
  ensure(
    Number.isFinite(start) && Number.isFinite(end) && start < end,
    'from must precede to',
  );
  return {
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
  };
}

/**
 * Check whether two time intervals overlap.
 *
 * @param a Actor performing the operation; used for role and access checks.
 * @param b b data of type TimeRange.
 * @returns Result of the operation described above.
 */
export function overlaps(a: TimeRange, b: TimeRange) {
  return (
    Date.parse(a.from) < Date.parse(b.to) &&
    Date.parse(b.from) < Date.parse(a.to)
  );
}
