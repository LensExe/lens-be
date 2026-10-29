import { ensure } from '@shared/domain/domain.error';

/** A rank in the `ranks` catalog. */
export interface RankRule {
  /** Rank code (for example, 'gold'). */
  code: string;
  /** Display name (for example, 'Gold'). */
  name: string;
  /** Minimum number of completed sessions required to attain the rank. */
  min_completed: number;
  /** Platform commission percentage for this rank. */
  commission_percent: number;
}

/** Photographer ranking rules and corresponding commission rates; values come from the `ranks` catalog. */
export class Rank {
  /**
   * Find the photographer's rank: the highest threshold not exceeding their number of completed sessions.
   *
   * @param completedBookings Number of completed bookings for the photographer (`photographer_ratings.total_bookings`).
   * @param rules Rank catalog in any order; it must include the rank with a zero-booking threshold.
   * @returns Rank achieved; throws `invalid` (HTTP 400) if the booking count is negative or non-integer, or if the catalog lacks the zero-threshold rank.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static of(completedBookings: number, rules: readonly RankRule[]): RankRule {
    ensure(
      Number.isInteger(completedBookings) && completedBookings >= 0,
      'completedBookings must be a non-negative integer',
    );
    Rank.assertCatalog(rules);
    return [...rules]
      .sort((x, y) => y.min_completed - x.min_completed)
      .find((rule) => completedBookings >= rule.min_completed)!;
  }

  /**
   * The rank catalog must include a rank with a zero-session threshold so every photographer has a rank.
   *
   * @param rules Rank catalog.
   * @returns Returns no value; throws `invalid` (HTTP 400) if the catalog lacks the zero-threshold rank.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertCatalog(rules: readonly RankRule[]) {
    ensure(
      rules.some((rule) => rule.min_completed === 0),
      'Rank catalog must contain a rank starting at 0 completed bookings',
    );
  }
}
