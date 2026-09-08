/**
 * Enum of cookie names.
 */
export enum CookieName {
  /** The name of the refresh token cookie. */
  KeycloakRefreshToken = 'keycloak_refresh_token',
  /** The name of the CSRF double-submit token cookie (JS-readable, not HttpOnly). */
  CsrfToken = 'csrf_token',
  /** The name of the single-session id cookie (HttpOnly, bound to the active session). */
  SessionId = 'session_id',
  /**
   * JS-readable "a refresh session exists" hint, issued in PARALLEL with the refresh
   * token (same lifetime, parent-domain scope). The refresh token is HttpOnly +
   * host-only on the API host, so the FE edge (proxy) can't read it; this hint lets
   * the FE decide the home->dashboard bounce. UX hint ONLY -- never trusted for authz.
   */
  SessionHint = 'session_hint',
}
