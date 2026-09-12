import { ensure } from '@shared/domain/domain.error';
import {
  interval,
  money,
  overlaps,
  utcDayInterval,
} from '@shared/domain/booking-values';
import {
  BookingStatus,
  OCCUPIED_BOOKING_STATUSES,
} from '@shared/database/entities/booking.entity';
export { BookingStatus, OCCUPIED_BOOKING_STATUSES };

export interface BookingDraftInput {
  customerId: string;
  customerUserId: string;
  photographerId: string;
  photographerUserId: string;
  photographerStatus: string;
  photographerAvailable: boolean;
  planId: string;
  planPhotographerId: string;
  planActive: boolean;
  planPrice: number;
  location: string;
  from: string;
  to: string;
  offlineDates: readonly string[];
  bookings: readonly { from: string; to: string; status: string }[];
  now: number;
}

export class Booking {
  constructor(public status: BookingStatus) {}

  static prepare(input: BookingDraftInput) {
    ensure(
      input.photographerStatus === 'active' &&
        input.photographerAvailable &&
        input.planActive &&
        input.planPhotographerId === input.photographerId,
      'Photographer or plan unavailable',
      'conflict',
    );
    ensure(
      input.photographerUserId !== input.customerUserId,
      'Cannot book yourself',
    );
    const range = interval(input.from, input.to);
    ensure(Date.parse(range.from) > input.now, 'Booking must start in future');
    ensure(
      !input.offlineDates.some((date) => overlaps(range, utcDayInterval(date))),
      'Photographer is unavailable on this date',
      'conflict',
    );
    ensure(
      !input.bookings.some(
        (booking) =>
          (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(
            booking.status,
          ) && overlaps(booking, range),
      ),
      'Photographer already booked or blocked',
      'conflict',
    );
    const total = money(input.planPrice);
    return {
      customer_id: input.customerId,
      photographer_id: input.photographerId,
      booking_plan_id: input.planId,
      location: input.location,
      ...range,
      total_amount: total,
      deposit_amount: Math.ceil(total * 0.3),
      status: BookingStatus.PENDING,
    };
  }

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
