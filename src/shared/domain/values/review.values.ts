/** Trạng thái hiển thị của review. */
export const ReviewStatus = {
  VISIBLE: 'visible',
  DELETED_BY_AUTHOR: 'deleted_by_author',
  HIDDEN_BY_ADMIN: 'hidden_by_admin',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
