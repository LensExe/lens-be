import type { CookieOptions, Response } from 'express';

/** The `headers` field of {@link CookieRequestLike}. */
export interface CookieRequestHeaders {
  cookie?: unknown;
  [key: string]: unknown;
}

/**
 * Minimal request shape cookie reads need -- Express `Request` or the Keycloak
 * guard's header bag. Avoids `as unknown as Request` at GraphQL/guard seams.
 */
export interface CookieRequestLike {
  cookies?: Record<string, unknown>;
  headers?: CookieRequestHeaders;
}
import { CookieName } from '../enums';

/** Params for attaching an HttpOnly cookie to the response. */
export interface AttachHttpOnlyCookieParams {
  res: Response;
  name: CookieName;
  value: string;
  options?: CookieOptions;
}

/** Params for attaching a JS-readable (non-HttpOnly) cookie, e.g. the CSRF token. */
export interface AttachReadableCookieParams {
  /** The Express response to attach the cookie to. */
  res: Response;
  /** The name of the cookie to set. */
  name: CookieName;
  /** The cookie value (must be readable by client-side JS). */
  value: string;
  /** Optional overrides merged over the secure defaults. */
  options?: CookieOptions;
}

/** Params for clearing a cookie by name. */
export interface ClearCookieParams {
  res: Response;
  name: CookieName;
  options?: CookieOptions;
}
