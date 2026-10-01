import { ensure } from '@shared/domain/domain.error';
import { money } from '@shared/domain/rules/money.rules';
import { PAYMENT_DUE_AFTER_HOURS } from '@modules/booking/core/booking.domain';

const MAX_AMOUNT = 9_000_000_000_000;
export const BOOKING_ESCROW_HOLD_HOURS = 72;
const BOOKING_ESCROW_HOLD_MS = BOOKING_ESCROW_HOLD_HOURS * 60 * 60 * 1000;
export const PAYMENT_CHECKOUT_TTL_HOURS = 24;
export const PAYMENT_REQUEST_SLA_HOURS = 24;
export const PAYMENT_REQUEST_ESCALATION_HOURS = 72;
export const MAX_PAYMENT_DEADLINE_EXTENSION_HOURS = 168;

export class Payment {
  constructor(
    readonly amount: number,
    readonly status: string,
  ) {
    money(amount);
  }

  /**
   * Validate an amount against the system payment rules.
   *
   * @param amount Transaction amount in VND.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the amount is not a valid supported VND amount.
   */
  static assertAmount(amount: number) {
    ensure(
      Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT,
      'Invalid VND amount',
    );
  }

  /** Calculate the deposit deadline shared by intent creation and the booking expiry worker. */
  static depositDeadlineAt(acceptedAt: string | null, shootStartsAt: string) {
    const acceptedAtMs = acceptedAt ? Date.parse(acceptedAt) : Number.NaN;
    const shootStartsAtMs = Date.parse(shootStartsAt);
    ensure(
      Number.isFinite(acceptedAtMs) && Number.isFinite(shootStartsAtMs),
      'Booking payment deadline data is missing or invalid',
      'conflict',
    );
    return new Date(
      Math.min(acceptedAtMs + PAYMENT_DUE_AFTER_HOURS * 36e5, shootStartsAtMs),
    ).toISOString();
  }

  /** Calculate the local checkout lifetime for a wallet top-up. */
  static checkoutExpiresAt(now = Date.now()) {
    return new Date(now + PAYMENT_CHECKOUT_TTL_HOURS * 36e5).toISOString();
  }

  /** Calculate the first administrative processing deadline for a payment request. */
  static requestProcessingDueAt(now = Date.now()) {
    return new Date(now + PAYMENT_REQUEST_SLA_HOURS * 36e5).toISOString();
  }

  /**
   * Extend an operational payment deadline by a bounded number of hours.
   *
   * @param dueAt Current deadline as an ISO timestamp.
   * @param hours Number of hours to add, from 1 through 168.
   * @param now Current time in milliseconds.
   * @returns New deadline as an ISO timestamp.
   * @throws {DomainError} Thrown when the deadline is invalid or the extension is outside the allowed range.
   */
  static extendProcessingDeadline(
    dueAt: string,
    hours: number,
    now = Date.now(),
  ) {
    const dueAtMs = Date.parse(dueAt);
    ensure(Number.isFinite(dueAtMs), 'Payment deadline is invalid', 'conflict');
    ensure(
      Number.isInteger(hours) &&
        hours >= 1 &&
        hours <= MAX_PAYMENT_DEADLINE_EXTENSION_HOURS,
      `Payment deadline extension must be between 1 and ${MAX_PAYMENT_DEADLINE_EXTENSION_HOURS} hours`,
    );
    return new Date(Math.max(dueAtMs, now) + hours * 36e5).toISOString();
  }

  /**
   * A new deposit intent may only be created before the earlier of the deposit deadline and shoot start.
   * Existing intents remain reusable so retries do not create another payment order.
   *
   * @param acceptedAt Time the booking was accepted.
   * @param shootStartsAt Scheduled shoot start time.
   * @param now Current time in milliseconds.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the acceptance time is missing or the deposit deadline has passed.
   */
  static assertDepositIntentOpen(
    acceptedAt: string | null,
    shootStartsAt: string,
    now = Date.now(),
  ) {
    const acceptedAtMs = acceptedAt ? Date.parse(acceptedAt) : Number.NaN;
    const shootStartsAtMs = Date.parse(shootStartsAt);
    ensure(
      Number.isFinite(acceptedAtMs) && Number.isFinite(shootStartsAtMs),
      'Booking payment deadline data is missing or invalid',
      'conflict',
    );
    ensure(
      acceptedAtMs + PAYMENT_DUE_AFTER_HOURS * 36e5 > now &&
        shootStartsAtMs > now,
      'Deposit payment deadline has passed',
      'conflict',
    );
  }

  /**
   * Calculate when photographer escrow becomes eligible for release after a booking completes.
   *
   * @param completedAt Time when the booking was completed.
   * @returns ISO timestamp at the end of the 72-hour review period.
   * @throws {DomainError} Thrown when the completion timestamp is missing or invalid.
   */
  static escrowReleaseAt(completedAt: string) {
    const completedAtMs = Date.parse(completedAt);
    ensure(
      Number.isFinite(completedAtMs),
      'Booking completion time is missing or invalid',
      'conflict',
    );
    return new Date(completedAtMs + BOOKING_ESCROW_HOLD_MS).toISOString();
  }

  /**
   * Ensure a customer refund request is submitted before the completed-booking review period closes.
   *
   * @param refundRequestDeadlineAt Customer refund-request cutoff.
   * @param now Current time in milliseconds.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the review period has closed.
   */
  static assertCompletedRefundWindowOpen(
    refundRequestDeadlineAt: string,
    now = Date.now(),
  ) {
    const refundRequestDeadlineMs = Date.parse(refundRequestDeadlineAt);
    ensure(
      Number.isFinite(refundRequestDeadlineMs),
      'Booking refund request deadline is missing or invalid',
      'conflict',
    );
    ensure(
      now < refundRequestDeadlineMs,
      'The refund request window for this completed booking has closed',
      'conflict',
    );
  }

  /**
   * Validate the amount received in the payment callback before accepting the transaction.
   *
   * @param receivedAmount Amount received.
   * @returns Result of the operation described above.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  acceptCallback(receivedAmount: number) {
    ensure(receivedAmount === this.amount, 'Callback amount does not match');
    return this.status === 'paid' ? 'duplicate' : 'paid';
  }
}
