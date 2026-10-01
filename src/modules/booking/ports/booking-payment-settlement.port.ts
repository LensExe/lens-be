import type { EntityManager } from 'typeorm';

/** Payment side effects coupled to booking cancellation and completion. */
export abstract class BookingPaymentSettlementPort {
  /**
   * Start the post-completion escrow review period for a booking.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param completedAt Time when the booking was completed.
   * @returns No value is returned.
   */
  abstract scheduleBookingEscrowRelease(
    manager: EntityManager,
    bookingId: string,
    completedAt: string,
  ): Promise<void>;

  /**
   * Create refund requests for canceled bookings using the supplied requester and reason.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param requestedBy Requester.
   * @param reason Reason for the operation.
   * @returns Result of the operation described above.
   */
  abstract requestCancellationRefunds(
    manager: EntityManager,
    bookingId: string,
    requestedBy: string | null,
    reason: string | null,
  ): Promise<void>;

  /**
   * Release the held booking payment using the idempotency key.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingId Booking ID associated with the operation.
   * @param settlementKey Settlement idempotency key.
   * @returns Result of the operation described above.
   */
  abstract releaseBookingEscrow(
    manager: EntityManager,
    bookingId: string,
    settlementKey: string,
  ): Promise<void>;
}
