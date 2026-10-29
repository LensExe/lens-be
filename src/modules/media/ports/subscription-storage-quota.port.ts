import type { EntityManager } from 'typeorm';

/** Subscription quota check requested by Media before issuing an upload URL. */
export abstract class SubscriptionStorageQuotaPort {
  abstract assertUploadAllowed(
    manager: EntityManager,
    userId: string,
    currentBytes: number,
    requestedBytes: number,
  ): Promise<void>;
}
