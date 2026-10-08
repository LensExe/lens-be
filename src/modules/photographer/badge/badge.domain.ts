import type { BadgeMetric } from '@shared/domain/values/badge.values';

/** Input metrics used to evaluate badges, based on visible reviews and booking statistics. */
export interface BadgeStats {
  /** Average overall rating (1–5) across visible reviews. */
  averageRating: number;
  /** Average punctuality rating (1–5) across visible reviews. */
  averagePunctuality: number;
  /** Number of visible reviews. */
  visibleReviews: number;
  /** Number of customers who have successfully booked at least twice. */
  returnCustomers: number;
}

/** A badge rule from the `badges` catalog. */
export interface BadgeRule {
  /** Badge code. */
  code: string;
  /** Metric used for evaluation. */
  metric: BadgeMetric;
  /** Minimum metric value. */
  min_value: number;
  /** Minimum number of visible reviews (0 means no minimum is required). */
  min_reviews: number;
  /** When disabled, do not award it to new users. */
  is_active: boolean;
}

/** How to derive each metric value from the photographer's statistics. */
const METRICS: Record<BadgeMetric, (stats: BadgeStats) => number> = {
  average_rating: (stats) => stats.averageRating,
  average_punctuality: (stats) => stats.averagePunctuality,
  return_customers: (stats) => stats.returnCustomers,
};

/** Rules for awarding photographer badges; thresholds come from the `badges` catalog. */
export class Badge {
  /**
   * Determine which badges a photographer qualifies for: the badge must be enabled, meet the minimum review count, and have a metric value at or above the threshold.
   *
   * @param stats Photographer review and repeat-customer statistics.
   * @param rules Badge definitions.
   * @returns Codes of the earned badges, in catalog order.
   */
  static earned(stats: BadgeStats, rules: readonly BadgeRule[]) {
    return rules
      .filter(
        (rule) =>
          rule.is_active &&
          stats.visibleReviews >= rule.min_reviews &&
          METRICS[rule.metric](stats) >= rule.min_value,
      )
      .map((rule) => rule.code);
  }
}
