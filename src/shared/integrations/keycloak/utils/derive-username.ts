/** Params for {@link deriveUsername}. */
export interface DeriveUsernameParams {
  /** The user's email; its local-part (before "@") becomes the default username. */
  email?: string | null;
  /** Fallback handle when no usable email is present (e.g. Keycloak `preferred_username`). */
  fallback?: string | null;
}

/**
 * Derive the default username for a newly-created user.
 *
 * The username is the URL-facing, GitHub-style handle, so by default it is the
 * local-part of the email -- `"tucuong183@gmail.com"` -> `"tucuong183"`. When no
 * usable email is present it falls back to `fallback` (e.g. the Keycloak
 * `preferred_username`), then to the raw email, then to an empty string.
 *
 * @param params - {@link DeriveUsernameParams}
 * @returns the derived username (trimmed)
 *
 * @example
 * deriveUsername({ email: "tucuong183@gmail.com" }) // "tucuong183"
 */
export const deriveUsername = ({
  email,
  fallback,
}: DeriveUsernameParams): string => {
  // an email with a local-part wins -- take everything before the first "@"
  const localPart = email?.includes('@')
    ? email.slice(0, email.indexOf('@'))
    : null;
  // prefer the email local-part, then the explicit fallback, then the raw email
  return (localPart ?? fallback ?? email ?? '').trim();
};
