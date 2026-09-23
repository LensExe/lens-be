/**
 * Derive the default username for a newly-created user.
 *
 * The username is the URL-facing, GitHub-style handle, so by default it is the
 * local-part of the email -- `"anhdonguyennhi@gmail.com"` -> `"anhdonguyennhi"`.
 * When no usable email is present it falls back to `fallback` (e.g. the Keycloak
 * `preferred_username`), then to the raw email, then to an empty string.
 *
 * @param params - {@link DeriveUsernameParams}
 * @returns the derived username (trimmed)
 *
 * @example
 * deriveUsername({ email: "anhdonguyennhi@gmail.com" }) // "anhdonguyennhi"
 */
export const DeriveUsername = (email: string): string => {
  // an email with a local-part wins -- take everything before the first "@"
  const localPart = email.includes('@')
    ? email.slice(0, email.indexOf('@'))
    : null;
  // prefer the email local-part, then the explicit fallback, then the raw email
  return (localPart ?? email ?? '').trim();
};
