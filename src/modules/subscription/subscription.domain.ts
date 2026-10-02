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

  /** Read the configured storage entitlement from structured plan features. */
  static storageLimitBytes(features: readonly unknown[]): number | null {
    for (const feature of features) {
      let value: unknown;
      if (
        typeof feature === 'object' &&
        feature !== null &&
        'code' in feature &&
        feature.code === 'storage_limit_bytes' &&
        'value' in feature
      ) {
        value = feature.value;
      } else if (typeof feature === 'string') {
        const legacyValue = feature.match(
          /^storage_limit_bytes:(unlimited|\d+)$/i,
        )?.[1];
        if (legacyValue !== undefined) value = legacyValue;
      }
      if (value === undefined) continue;
      if (typeof value === 'string' && value.toLowerCase() === 'unlimited')
        return null;

      const limit = Number(value);
      ensure(
        Number.isSafeInteger(limit) && limit >= 0,
        'Subscription storage limit is invalid',
        'conflict',
      );
      return limit;
    }
    return null;
  }

  /** Reject an upload when its reserved size would exceed the active plan's cap. */
  static assertStorageAvailable(
    limitBytes: number | null,
    currentBytes: number,
    requestedBytes: number,
  ) {
    ensure(
      Number.isSafeInteger(currentBytes) && currentBytes >= 0,
      'Current storage usage is invalid',
      'conflict',
    );
    ensure(
      Number.isSafeInteger(requestedBytes) && requestedBytes >= 0,
      'Requested storage usage is invalid',
      'invalid',
    );
    if (limitBytes === null) return;
    ensure(
      Number.isSafeInteger(currentBytes + requestedBytes) &&
        currentBytes + requestedBytes <= limitBytes,
      'Subscription storage quota exceeded',
      'conflict',
    );
  }
}
