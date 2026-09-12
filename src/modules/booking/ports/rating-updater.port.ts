import type { EntityManager } from 'typeorm';

/** Synchronous rating update inside the caller's transaction. */
export abstract class RatingUpdaterPort {
  abstract recalculate(
    manager: EntityManager,
    photographerId: string,
  ): Promise<void>;
}
