import type { EntityManager } from 'typeorm';

/** Bookings using a plan (from the booking module), so plans with existing bookings cannot be deleted. */
export abstract class PlanBookingsPort {
  /**
   * Number of bookings in any status that use a plan.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param planId Booking plan ID.
   * @returns Number of bookings.
   */
  abstract bookingCountForPlan(
    manager: EntityManager,
    planId: string,
  ): Promise<number>;
}
