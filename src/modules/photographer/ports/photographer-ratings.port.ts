import type { EntityManager } from 'typeorm';

/** Get a photographer's rating statistics; return zeros for all values if no statistics exist yet. */
export interface PhotographerRatingStats {
  /** Average score across visible reviews (0 when there are no reviews). */
  average_rating: number;
  /** Number of visible reviews. */
  total_feedbacks: number;
  /** Number of completed bookings. */
  total_bookings: number;
  /** Number of customers who have completed at least two bookings with the photographer. */
  return_customers: number;
}

/** A photographer's rating and review scores (from the feedback module), used to build profiles and evaluate badges. */
export abstract class PhotographerRatingsPort {
  /**
   * Get rating statistics for multiple photographers in one query.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerIds Photographer profile IDs.
   * @returns Map from photographer ID to statistics; includes every requested photographer, with zeros when data is missing.
   */
  abstract ratingsOf(
    manager: EntityManager,
    photographerIds: readonly string[],
  ): Promise<Record<string, PhotographerRatingStats>>;

  /**
   * A photographer's average punctuality score, based only on visible reviews.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @returns Average score, or 0 if there are no reviews.
   */
  abstract averagePunctuality(
    manager: EntityManager,
    photographerId: string,
  ): Promise<number>;

  /**
   * Create an empty rating record for a new photographer (skip if one already exists).
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @returns Returns no value.
   */
  abstract openRating(
    manager: EntityManager,
    photographerId: string,
  ): Promise<void>;
}
