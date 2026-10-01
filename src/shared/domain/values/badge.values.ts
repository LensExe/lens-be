/** Metric used to evaluate badges. */
export const BadgeMetric = {
  AVERAGE_RATING: 'average_rating',
  AVERAGE_PUNCTUALITY: 'average_punctuality',
  RETURN_CUSTOMERS: 'return_customers',
} as const;

export type BadgeMetric = (typeof BadgeMetric)[keyof typeof BadgeMetric];
