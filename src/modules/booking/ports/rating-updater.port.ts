import type { EntityManager } from 'typeorm';

/** Write booking statistics to the photographer rating (Feedback module) in the caller’s transaction. */
export abstract class RatingUpdaterPort {
  /**
   * Record completed booking counts and repeat customers for the photographer (counted from the Booking module’s own table).
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @param stats `completedBookings`, `returnCustomers`
   * @returns Returns no value.
   */
  abstract recordBookingStats(
    manager: EntityManager,
    photographerId: string,
    stats: { completedBookings: number; returnCustomers: number },
  ): Promise<void>;
}
