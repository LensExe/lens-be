import type { EntityManager } from 'typeorm';
import type { BookingEntity } from '@shared/database/entities/booking.entity';

/** Photographer bookings (from the Booking module), used by Calendar to build availability and calendars and check blocks. */
export abstract class PhotographerBookingsPort {
  /**
   * Photographer bookings in every status that overlap a time range, ordered by start time.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @param window Optional ISO `from` and `to` values; either may be supplied independently.
   * @returns Bookings that overlap the time range.
   */
  abstract bookingsOverlapping(
    manager: EntityManager,
    photographerId: string,
    window: { from?: string; to?: string },
  ): Promise<BookingEntity[]>;
}
