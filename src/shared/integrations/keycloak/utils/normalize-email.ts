/** Return the canonical form used for identity email comparisons and storage. */
export const NormalizeEmail = (email: string): string =>
  email.trim().toLowerCase();
