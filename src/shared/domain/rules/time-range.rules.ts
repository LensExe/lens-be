import { ensure } from '@shared/domain/domain.error';
import type { TimeRange } from '@shared/domain/types/time-range.types';

/** Chuẩn hóa một khoảng thời gian UTC dạng nửa mở [from, to). */
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

/** Kiểm tra hai khoảng thời gian có giao nhau hay không. */
export function overlaps(a: TimeRange, b: TimeRange) {
  return (
    Date.parse(a.from) < Date.parse(b.to) &&
    Date.parse(b.from) < Date.parse(a.to)
  );
}
