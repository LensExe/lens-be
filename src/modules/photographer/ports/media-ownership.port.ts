import type { EntityManager } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';

/** Verify that the current actor owns media ready for a portfolio. */
export abstract class MediaOwnershipPort {
  abstract owned(
    manager: EntityManager,
    actor: Actor,
    mediaId: string,
    ready?: boolean,
  ): Promise<{ id: string }>;
}
