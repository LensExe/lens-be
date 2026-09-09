import { ensure } from '@shared/platform/exceptions/domain.error';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'in_progress'
  | 'shot'
  | 'completed';
export class Booking {
  constructor(public status: BookingStatus) {}
  transition(action: string, paid: boolean, delivered: boolean): BookingStatus {
    const transitions: Record<string, [BookingStatus[], BookingStatus]> = {
      accept: [['pending'], 'accepted'],
      reject: [['pending'], 'rejected'],
      cancel: [['pending', 'accepted'], 'cancelled'],
      start: [['accepted'], 'in_progress'],
      completeShoot: [['in_progress'], 'shot'],
      complete: [['shot'], 'completed'],
    };
    const rule = transitions[action];
    ensure(
      rule && rule[0].includes(this.status),
      `Cannot ${action} booking in ${this.status}`,
      'conflict',
    );
    if (action === 'start')
      ensure(paid, 'Deposit must be paid before starting', 'conflict');
    if (action === 'complete')
      ensure(
        paid && delivered,
        'Full payment and published gallery required',
        'conflict',
      );
    return (this.status = rule[1]);
  }
}
export function interval(from: string, to: string) {
  const a = Date.parse(from),
    b = Date.parse(to);
  ensure(
    Number.isFinite(a) && Number.isFinite(b) && a < b,
    'from must precede to',
  );
  return { from: new Date(a).toISOString(), to: new Date(b).toISOString() };
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
export function money(value: number) {
  ensure(
    Number.isSafeInteger(value) && value > 0 && value <= 9e12,
    'Invalid VND amount',
  );
  return value;
}
