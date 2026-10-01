import type { EntityManager } from 'typeorm';

/** Legacy collaboration contract, currently not bound to Calendar while the feature is disabled. */
export abstract class CollaborationTimesPort {
  /**
   * Accepted collaboration sessions (invitation accepted and booking still occupies the schedule) that overlap a time range.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID of the linked photographer.
   * @param range Time range to check.
   * @returns `{ from, to, status }` ranges for bookings the photographer is participating in.
   */
  abstract collaborationTimes(
    manager: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ): Promise<{ from: string; to: string; status: string }[]>;
}
