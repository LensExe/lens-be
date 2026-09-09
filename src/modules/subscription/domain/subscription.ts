export class Subscription {
  constructor(
    readonly status: string,
    readonly expiresAt: string | null,
  ) {}
  effectiveStatus(now = Date.now()) {
    return this.status === 'active' &&
      this.expiresAt &&
      Date.parse(this.expiresAt) <= now
      ? 'expired'
      : this.status;
  }
}
