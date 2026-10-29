import type { EntityManager } from 'typeorm';

/** Media usage required to report and enforce subscription storage entitlements. */
export abstract class SubscriptionStorageUsagePort {
  abstract usage(
    manager: EntityManager,
    userId: string,
  ): Promise<{
    storage_bytes: number;
    reserved_storage_bytes: number;
    total_bytes: number;
  }>;
}
