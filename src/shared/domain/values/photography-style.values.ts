/**
 * Shared vocabulary for customer and photographer photography styles.
 *
 * Values are kept lowercase so they can be used directly in
 * recommendations and search filters.
 */
export const PhotographyStyle = {
  PORTRAIT: 'portrait',
  VINTAGE: 'vintage',
  KOREAN: 'korean',
  WEDDING: 'wedding',
  CONCEPT: 'concept',
  PRE_WEDDING: 'pre-wedding',
  BEACH: 'beach',
  LIFESTYLE: 'lifestyle',
  EVENT: 'event',
  CORPORATE: 'corporate',
  FAMILY: 'family',
  OUTDOOR: 'outdoor',
  KIDS: 'kids',
  STREETWEAR: 'streetwear',
  FASHION: 'fashion',
  FILM: 'film',
  MATERNITY: 'maternity',
  COMMERCIAL: 'commercial',
} as const;

export type PhotographyStyle =
  (typeof PhotographyStyle)[keyof typeof PhotographyStyle];

const photographyStyleValues = Object.values(
  PhotographyStyle,
) as PhotographyStyle[];

/**
 * Check whether a value is one of the supported photography styles.
 *
 * @param value String value used by the operation: value.
 * @returns Result returned by `includes`.
 */
export function isPhotographyStyle(value: string): value is PhotographyStyle {
  return photographyStyleValues.includes(value as PhotographyStyle);
}
