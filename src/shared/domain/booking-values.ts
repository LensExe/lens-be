import { ensure } from '@shared/domain/domain.error';

/** Half-open UTC interval: [from, to). */
export function interval(from: string, to: string) {
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

export function overlaps(
  a: { from: string; to: string },
  b: { from: string; to: string },
) {
  return (
    Date.parse(a.from) < Date.parse(b.to) &&
    Date.parse(b.from) < Date.parse(a.to)
  );
}

export function utcDayInterval(date: string) {
  const from = `${date}T00:00:00.000Z`;
  return interval(from, new Date(Date.parse(from) + 864e5).toISOString());
}

export function money(value: number) {
  ensure(
    Number.isSafeInteger(value) && value > 0 && value <= 9e12,
    'Invalid VND amount',
  );
  return value;
}
