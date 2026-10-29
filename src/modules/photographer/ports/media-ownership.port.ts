import type { EntityManager } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';

/** Verify that the media belongs to the current caller and is ready to be added to a portfolio. */
export abstract class MediaOwnershipPort {
  /**
   * Check whether the caller owns the requested media and whether the media is in the required state.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param mediaId Media ID to process.
   * @param ready Flag indicating whether ready should be processed.
   * @returns Result of the operation described above.
   */
  abstract owned(
    manager: EntityManager,
    actor: Actor,
    mediaId: string,
    ready?: boolean,
  ): Promise<{ id: string }>;
}
