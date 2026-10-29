import type { EntityManager } from 'typeorm';

export interface CustomerBookingStats {
  /** Total number of bookings created. */
  total: number;
  /** Number of bookings currently pending. */
  pending: number;
  /** Number of completed bookings. */
  completed: number;
  /** Total amount paid (VND). */
  total_spent_vnd: number;
}

export abstract class CustomerBookingStatsPort {
  /**
   * Get booking and activity statistics for the customer.
   *
   * @param manager EntityManager for the current transaction.
   * @param customerId Customer ID associated with the operation.
   * @returns Result of the operation described above.
   */
  abstract statsForCustomer(
    manager: EntityManager,
    customerId: string,
  ): Promise<CustomerBookingStats>;
}
