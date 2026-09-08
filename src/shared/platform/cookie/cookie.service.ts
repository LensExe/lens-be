import { Injectable } from '@nestjs/common';
import type { CookieOptions } from 'express';
import {
  AttachHttpOnlyCookieParams,
  AttachReadableCookieParams,
  ClearCookieParams,
  CookieRequestLike,
} from './types/cookie';
import { envConfig } from '../env/env.config';
import { CookieName } from './enums';

@Injectable()
/**
 * Service for attaching and clearing HttpOnly cookies on Express response.
 * Used for refresh tokens and logout.
 *
 * @example
 * cookieService.attachHttpOnlyCookie({ res, name: "refreshToken", value: token })
 * cookieService.clearCookie({ res, name: "refreshToken" })
 */
export class CookieService {
  constructor() {}

  /**
   * Attaches a secure HttpOnly cookie to the response.
   * Typically used for refresh tokens (not accessible via JavaScript).
   *
   * @param param - Response, cookie name, value, optional cookie options
   * @returns void
   *
   * @example
   * cookieService.attachHttpOnlyCookie({ res, name: "refreshToken", value: token })
   */
  attachHttpOnlyCookie({
    res,
    name,
    value,
    options,
  }: AttachHttpOnlyCookieParams): void {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: envConfig().app.isProduction,
      // "strict" blocks the cookie on cross-site requests, neutering CSRF
      // against the refresh-token flow (browser won't auto-attach it)
      sameSite: 'strict',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    };
    const merged: CookieOptions = {
      ...defaultOptions,
      ...options,
    };
    res.cookie(name, value, merged);
    // The refresh token is HttpOnly + host-only on the API host, so the FE edge
    // (proxy) can't read it. Issue a parallel JS-readable "session hint" at the
    // SAME lifetime + parent-domain scope so the FE can decide the home->dashboard
    // bounce. UX hint ONLY -- never trusted for authorization.
    if (name === CookieName.KeycloakRefreshToken) {
      this.attachReadableCookie({
        res,
        name: CookieName.SessionHint,
        value: '1',
        options: {
          maxAge: merged.maxAge,
          // "lax" (not "strict"): the FE edge proxy must read this hint on a
          // TOP-LEVEL navigation that may originate cross-site (a logged-in
          // user clicking a link from email/Google straight into a protected
          // page). "strict" would withhold it on that first hop -> the proxy
          // would mis-bounce them to the landing. Safe to relax: the hint is a
          // non-secret "1" used only to pick the first-paint shell, never authz.
          sameSite: 'lax',
        },
      });
    }
  }

  /**
   * Attaches a JS-readable (non-HttpOnly) cookie to the response.
   * Used for the CSRF double-submit token, which the client must read and
   * echo back in a request header.
   *
   * @param param - Response, cookie name, value, optional cookie options
   * @returns void
   *
   * @example
   * cookieService.attachReadableCookie({ res, name: CookieName.CsrfToken, value: token })
   */
  attachReadableCookie({
    res,
    name,
    value,
    options,
  }: AttachReadableCookieParams): void {
    // httpOnly is intentionally false so the SPA can read the token and
    // mirror it into the X-CSRF-Token header (double-submit pattern)
    const defaultOptions: CookieOptions = {
      httpOnly: false,
      // only sent over HTTPS in production, same as the refresh cookie
      secure: envConfig().app.isProduction,
      // strict keeps the token off cross-site requests as defense-in-depth
      sameSite: 'strict',
      path: '/',
      // scope to the parent domain (e.g. ".academy.starci.org") so the SPA
      // on the apex/sibling host can read the cookie that api.<...> issued.
      // empty config -> undefined -> host-only cookie (local dev)
      domain: envConfig().cookie.domain || undefined,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    };
    res.cookie(name, value, {
      ...defaultOptions,
      ...options,
    });
  }

  /**
   * Clears a cookie by name (e.g. on logout).
   *
   * @param param - Response, cookie name, optional options
   * @returns void
   *
   * @example
   * cookieService.clearCookie({ res, name: "refreshToken" })
   */
  clearCookie({ res, name, options }: ClearCookieParams): void {
    res.clearCookie(name, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      ...options,
    });
    // drop the parallel session hint alongside the refresh token -- match the
    // attributes it was issued with (non-HttpOnly + parent-domain scope) so the
    // browser actually removes it
    if (name === CookieName.KeycloakRefreshToken) {
      res.clearCookie(CookieName.SessionHint, {
        httpOnly: false,
        secure: envConfig().app.isProduction,
        // match the "lax" the hint was issued with (see attachHttpOnlyCookie)
        sameSite: 'lax',
        path: '/',
        domain: envConfig().cookie.domain || undefined,
      });
    }
  }

  /**
   * Safely retrieves a cookie value from a request object.
   * Handles both `req.cookies` (if middleware is used) and manual header parsing.
   *
   * @param req - The incoming request object.
   * @param name - The name of the cookie to retrieve.
   * @returns The cookie value if found, undefined otherwise.
   */
  getCookie(
    req: CookieRequestLike | undefined,
    name: string,
  ): string | undefined {
    if (!req) return undefined;

    // 1. Try req.cookies (populated by cookie-parser middleware)
    const parsed = req.cookies?.[name];
    if (typeof parsed === 'string') {
      return parsed;
    }

    // 2. Fallback to manual header parsing
    const cookieHeader = req.headers?.cookie;
    if (typeof cookieHeader === 'string') {
      const match = new RegExp(String.raw`(?:^|;\s*)${name}=([^;]+)`).exec(
        cookieHeader,
      );
      if (match?.[1]) {
        return decodeURIComponent(match[1].trim());
      }
    }

    return undefined;
  }

  /**
   * Returns EVERY value for a cookie name from the raw `Cookie` header.
   *
   * `cookie-parser` collapses duplicate cookie names to the FIRST occurrence, but
   * a browser can legitimately send two same-named cookies with different scopes --
   * e.g. a legacy host-only `csrf_token` alongside a newer domain-scoped one during
   * a `COOKIE_DOMAIN` rollout. The CSRF double-submit needs every candidate so it
   * can match whichever value the SPA was able to read.
   *
   * @param req - The incoming request object.
   * @param name - The cookie name to collect all values for.
   * @returns All decoded values for `name`, in header order (empty when none).
   */
  getAllCookieValues(
    req: CookieRequestLike | undefined,
    name: string,
  ): Array<string> {
    const cookieHeader = req?.headers?.cookie;
    if (typeof cookieHeader !== 'string') {
      return [];
    }
    const values: Array<string> = [];
    // scan every `name=value` pair (the global flag walks past the first match)
    const regex = new RegExp(String.raw`(?:^|;\s*)${name}=([^;]+)`, 'g');
    let match: RegExpExecArray | null = regex.exec(cookieHeader);
    while (match !== null) {
      values.push(decodeURIComponent(match[1].trim()));
      match = regex.exec(cookieHeader);
    }
    return values;
  }
}
