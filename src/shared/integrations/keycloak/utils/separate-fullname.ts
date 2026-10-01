/**
 * Split `fullname` into `firstName` and `lastName` for Keycloak.
 * This ensures that when Keycloak combines `${firstName} ${lastName}` (for the OpenID Connect `name` claim),
 * the Vietnamese name remains in the correct order:
 * - `firstName`: family name and middle name (the first words).
 * - `lastName`: given name (the final word).
 * Vietnamese name example: "Nguyễn Văn A" -> `firstName: "Nguyễn Văn"`, `lastName: "A"`.
 *        "John Doe"     -> firstName: "John",       lastName: "Doe"
 */

export interface SeparateFullname {
  firstName?: string;
  lastName?: string;
}

/**
 * Split a full name into given and family names.
 *
 * @param fullname String value used by the operation: fullname.
 * @returns Result object for the operation.
 */
export const SeparateFullname = (fullname?: string): SeparateFullname => {
  if (!fullname) {
    return {};
  }
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};
