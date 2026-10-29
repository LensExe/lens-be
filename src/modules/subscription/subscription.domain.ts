import { ensure } from '@shared/domain/domain.error';
import { SubscriptionStatus } from '@shared/domain/values/subscription.values';
import { SubscriptionFeatureCode } from '@shared/domain/types/plan.types';

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

  /** Validate feature records before they become part of a new purchase snapshot. */
  static assertFeaturesValid(features: readonly unknown[]) {
    const seen = new Set<string>();
    for (const feature of features) {
      if (typeof feature === 'string') continue; // Legacy display-only feature.
      ensure(
        typeof feature === 'object' && feature !== null && 'code' in feature,
        'Subscription feature is invalid',
        'conflict',
      );
      const code = feature.code;
      ensure(
        typeof code === 'string' &&
          Object.values(SubscriptionFeatureCode).includes(
            code as SubscriptionFeatureCode,
          ),
        'Subscription feature code is unsupported',
        'conflict',
      );
      ensure(
        !seen.has(code),
        'Subscription feature code is duplicated',
        'conflict',
      );
      seen.add(code);

      const expectedUnit = this.quotaUnit(code as SubscriptionFeatureCode);
      ensure(
        'name' in feature &&
          typeof feature.name === 'string' &&
          feature.name.trim().length > 0 &&
          'value' in feature &&
          typeof feature.value === 'string' &&
          (!('kind' in feature) || feature.kind === 'quota') &&
          (!('unit' in feature) || feature.unit === expectedUnit),
        'Subscription feature definition is invalid',
        'conflict',
      );
      this.quotaLimit(features, code as SubscriptionFeatureCode);
    }
  }

  /** Read the configured storage entitlement from structured plan features. */
  static storageLimitBytes(features: readonly unknown[]): number | null {
    return this.quotaLimit(
      features,
      SubscriptionFeatureCode.STORAGE_LIMIT_BYTES,
    );
  }

  /** Read the configured portfolio count entitlement. `null` means unlimited or unset. */
  static portfolioLimit(features: readonly unknown[]): number | null {
    return this.quotaLimit(features, SubscriptionFeatureCode.PORTFOLIO_LIMIT);
  }

  /** Reject creation of a portfolio after the active plan's count cap is reached. */
  static assertPortfolioAvailable(limit: number | null, currentCount: number) {
    ensure(
      Number.isSafeInteger(currentCount) && currentCount >= 0,
      'Current portfolio count is invalid',
      'conflict',
    );
    if (limit === null) return;
    ensure(
      currentCount < limit,
      'Subscription portfolio quota exceeded',
      'conflict',
    );
  }

  private static quotaLimit(
    features: readonly unknown[],
    code: SubscriptionFeatureCode,
  ): number | null {
    const expectedUnit = this.quotaUnit(code);
    let value: unknown;
    for (const feature of features) {
      if (
        typeof feature === 'object' &&
        feature !== null &&
        'code' in feature &&
        feature.code === code &&
        'value' in feature
      ) {
        ensure(
          value === undefined,
          'Subscription feature code is duplicated',
          'conflict',
        );
        value = feature.value;
        if ('unit' in feature)
          ensure(
            feature.unit === expectedUnit,
            'Subscription feature unit is invalid',
            'conflict',
          );
        if ('kind' in feature)
          ensure(
            feature.kind === 'quota',
            'Subscription feature kind is invalid',
            'conflict',
          );
      } else if (typeof feature === 'string') {
        const legacyValue = feature.match(
          new RegExp(
            `^${code}:(unlimited|\\d+(?:\\.\\d+)?(?:\\s*(?:KB|MB|GB|TB))?)$`,
            'i',
          ),
        )?.[1];
        if (legacyValue !== undefined) {
          ensure(
            value === undefined,
            'Subscription feature code is duplicated',
            'conflict',
          );
          value = legacyValue;
        }
      }
    }
    if (value === undefined) return null;
    ensure(
      typeof value === 'string',
      'Subscription quota value is invalid',
      'conflict',
    );
    const normalizedValue = value.trim();
    if (normalizedValue.toLowerCase() === 'unlimited') return null;

    let limit: number;
    if (expectedUnit === 'bytes') {
      const capacity = normalizedValue.match(
        /^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/i,
      );
      if (capacity) {
        const unitPower = ['KB', 'MB', 'GB', 'TB'].indexOf(
          capacity[2].toUpperCase(),
        );
        limit = Number(capacity[1]) * 1024 ** (unitPower + 1);
      } else {
        limit = Number(normalizedValue);
      }
    } else {
      limit = Number(normalizedValue);
    }

    ensure(
      Number.isSafeInteger(limit) && limit >= 0,
      'Subscription quota value is invalid',
      'conflict',
    );
    return limit;
  }

  private static quotaUnit(code: SubscriptionFeatureCode) {
    switch (code) {
      case SubscriptionFeatureCode.STORAGE_LIMIT_BYTES:
        return 'bytes';
      case SubscriptionFeatureCode.PORTFOLIO_LIMIT:
        return 'portfolios';
    }
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
