import { ensure } from '@shared/domain/domain.error';
import { SubscriptionStatus } from '@shared/domain/values/subscription.values';

export { SubscriptionStatus };

export class Subscription {
  constructor(
    readonly status: string,
    readonly expiresAt: string | null,
  ) {}

  /**
   * Calculate the subscription status effective at the specified time.
   *
   * @param now Current time in milliseconds.
   * @returns Result of the operation described above.
   */
  effectiveStatus(now = Date.now()) {
    return this.status === SubscriptionStatus.ACTIVE &&
      this.expiresAt &&
      Date.parse(this.expiresAt) <= now
      ? SubscriptionStatus.EXPIRED
      : this.status;
  }

  /**
   * Calculate the cycle end time from the start date and billing duration in days.
   *
   * @param startAt Start time.
   * @param billingCycleDays Numeric value used by the operation: billing cycle days.
   * @returns Result object containing the fields `start_at`, `end_at`.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static period(startAt: string, billingCycleDays: number) {
    ensure(
      Number.isInteger(billingCycleDays) && billingCycleDays > 0,
      'Invalid subscription billing cycle',
    );
    return {
      start_at: startAt,
      end_at: new Date(
        Date.parse(startAt) + billingCycleDays * 864e5,
      ).toISOString(),
    };
  }
}
