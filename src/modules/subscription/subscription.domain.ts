import { ensure } from '@shared/domain/domain.error';
import { SubscriptionStatus } from '@shared/database/entities/subscription.entity';

export { SubscriptionStatus };

export class Subscription {
  constructor(
    readonly status: string,
    readonly expiresAt: string | null,
  ) {}
  effectiveStatus(now = Date.now()) {
    return this.status === SubscriptionStatus.ACTIVE &&
      this.expiresAt &&
      Date.parse(this.expiresAt) <= now
      ? SubscriptionStatus.EXPIRED
      : this.status;
  }

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
