import { OCCUPIED_BOOKING_STATUSES } from '@shared/domain/values/booking.values';

/**
 * Check whether a booking blocks the photographer's schedule.
 *
 * @param status Current status or target status.
 * @returns Result returned by `includes`.
 */
export function isOccupied(status: string) {
  return (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);
}
