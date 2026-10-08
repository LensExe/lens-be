import {
  OCCUPIED_BOOKING_STATUSES,
  RESERVING_BOOKING_STATUSES,
} from '@shared/domain/values/booking.values';

/**
 * Check whether a booking has entered the accepted or active lifecycle and occupies the photographer's schedule.
 *
 * @param status Current status or target status.
 * @returns Result returned by `includes`.
 */
export function isOccupied(status: string) {
  return (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** Check whether a booking or pending request reserves a photographer's time. */
export function reservesTime(status: string) {
  return (RESERVING_BOOKING_STATUSES as readonly string[]).includes(status);
}
