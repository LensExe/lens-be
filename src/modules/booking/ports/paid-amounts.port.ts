import type { EntityManager } from 'typeorm';

/** Amount paid for a booking (from the Payment module), used to check whether the deposit or full amount has been paid. */
export abstract class PaidAmountsPort {
  /**
   * Total paid (deposit plus remaining balance from `paid` transactions) for each booking, queried for the whole list at once.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param bookingIds Booking IDs.
   * @returns Map from booking ID to the amount paid in VND (0 if nothing has been paid).
   */
  abstract paidAmounts(
    manager: EntityManager,
    bookingIds: readonly string[],
  ): Promise<Record<string, number>>;
}
