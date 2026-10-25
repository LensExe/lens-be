import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CookieName } from '@shared/platform/cookie/enums';
import { CookieService } from '@shared/platform/cookie/cookie.service';
import type { KeycloakExchangeCodeForTokenResponse } from '@shared/integrations/keycloak';

export const COOKIE_AUTH_MODE_HEADER = 'x-lens-auth-mode';

export function isCookieAuthRequest(request: Request): boolean {
  return request.headers[COOKIE_AUTH_MODE_HEADER] === 'cookie';
}

@Injectable()
export class AuthCookieSessionService {
  constructor(private readonly cookies: CookieService) {}

  setSessionCookies(
    request: Request,
    response: Response,
    tokenSet: KeycloakExchangeCodeForTokenResponse,
  ): void {
    this.cookies.attachHttpOnlyCookie({
      res: response,
      name: CookieName.KeycloakAccessToken,
      value: tokenSet.access_token,
      options: { maxAge: Math.max(1_000, tokenSet.expires_in * 1_000) },
    });
    this.cookies.attachHttpOnlyCookie({
      res: response,
      name: CookieName.KeycloakRefreshToken,
      value: tokenSet.refresh_token,
    });

    if (!this.cookies.getCookie(request, CookieName.CsrfToken)) {
      this.cookies.attachReadableCookie({
        res: response,
        name: CookieName.CsrfToken,
        value: this.cookies.createCsrfToken(),
      });
    }
  }

  getRefreshToken(request: Request): string | undefined {
    return this.cookies.getCookie(request, CookieName.KeycloakRefreshToken);
  }

  assertCsrfToken(request: Request): void {
    this.cookies.assertCsrfToken(request);
  }

  clearSessionCookies(response: Response): void {
    this.cookies.clearCookie({
      res: response,
      name: CookieName.KeycloakAccessToken,
    });
    this.cookies.clearCookie({
      res: response,
      name: CookieName.KeycloakRefreshToken,
    });
    this.cookies.clearCookie({ res: response, name: CookieName.CsrfToken });
  }
}
