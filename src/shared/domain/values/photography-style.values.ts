/**
 * Vocabulary dùng chung cho phong cách chụp của customer và photographer.
 *
 * Các giá trị được giữ ở dạng lowercase để có thể dùng trực tiếp trong
 * recommendation và các bộ lọc tìm kiếm.
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

export function isPhotographyStyle(value: string): value is PhotographyStyle {
  return photographyStyleValues.includes(value as PhotographyStyle);
}
