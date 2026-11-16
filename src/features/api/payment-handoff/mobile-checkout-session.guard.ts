import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CookieName } from '@shared/platform/cookie/enums';
import { CookieService } from '@shared/platform/cookie/cookie.service';
import type { Actor } from '@shared/platform/auth/actor';
import {
  MobileCheckoutHandoffService,
  type MobileCheckoutSession,
} from './mobile-checkout-handoff.service';

export const MOBILE_CHECKOUT_SESSION_COOKIE = CookieName.MobileCheckoutSession;

export interface MobileCheckoutRequest extends Request {
  actor?: Actor;
  mobileCheckout?: MobileCheckoutSession;
}

@Injectable()
export class MobileCheckoutSessionGuard implements CanActivate {
  constructor(
    private readonly checkout: MobileCheckoutHandoffService,
    private readonly cookies: CookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MobileCheckoutRequest>();
    const token = this.cookies.getCookie(
      request,
      MOBILE_CHECKOUT_SESSION_COOKIE,
    );
    const session = await this.checkout.getSession(token);
    if (!session)
      throw new UnauthorizedException('Checkout session has expired');

    request.actor = session.actor;
    request.mobileCheckout = session;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      this.cookies.assertCsrfToken(request);
    }
    return true;
  }
}

export function mobileCheckoutSessionToken(
  request: MobileCheckoutRequest,
  cookies: CookieService,
): string {
  const token = cookies.getCookie(request, MOBILE_CHECKOUT_SESSION_COOKIE);
  if (!token) throw new UnauthorizedException('Checkout session has expired');
  return token;
}
