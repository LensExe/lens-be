import type { EntityManager } from 'typeorm';

/** Read net paid amounts for bookings before exposing their delivery galleries. */
export abstract class BookingPaymentReadPort {
  /**
   * Return the amount paid for each booking after completed refunds.
   *
   * @param manager EntityManager for the caller's transaction.
   * @param bookingIds Booking IDs to check.
   * @returns Map from booking ID to net amount paid in VND.
   */
  abstract paidAmounts(
    manager: EntityManager,
    bookingIds: readonly string[],
  ): Promise<Record<string, number>>;
}
