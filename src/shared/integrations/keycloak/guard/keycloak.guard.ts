import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { KeycloakService } from '../keycloak.service';
import type { Actor } from '../../../platform/auth/actor';
import { currentUser } from '../../../common/access';
import { CookieName } from '../../../platform/cookie/enums';
import { CookieService } from '../../../platform/cookie/cookie.service';

// set metadata for roles

/**
 * Create a decorator that declares the roles required to access an endpoint.
 *
 * @param roles Roles assigned to the actor.
 * @returns Result returned by `SetMetadata`.
 */
export const Access = (roles: string[]) => SetMetadata('lens:roles', roles);
// set metadata for public

/**
 * Create a decorator that marks an endpoint as public.
 *
 * @returns Result returned by `SetMetadata`.
 */
export const Public = () => SetMetadata('lens:public', true);
// set metadata for registration

/**
 * Create a decorator that marks an endpoint as an account registration route.
 *
 * @returns Result returned by `SetMetadata`.
 */
export const Registration = () => SetMetadata('lens:registration', true);

@Injectable()
export class KeycloakGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly keycloak: KeycloakService,
    private readonly dataSource: DataSource,
    private readonly cookies: CookieService,
  ) {}

  /**
   * Check whether a request is allowed based on its token, roles, and endpoint policy.
   *
   * @param context context data of type ExecutionContext.
   * @returns Boolean indicating the result of the check or operation.
   * @throws {UnauthorizedException} Thrown when the credentials are invalid or have expired.
   * @throws {ForbiddenException} Thrown when the actor is not authorized.
   */
  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];

    // 1. If the route has `@Public()`, allow access without a token.
    if (this.reflector.getAllAndOverride('lens:public', targets)) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { actor?: Actor }>();
    const header = request.headers.authorization;
    const bearerToken =
      typeof header === 'string' && /^Bearer \S+$/i.test(header)
        ? header.slice(7)
        : undefined;
    const cookieToken = this.cookies.getCookie(
      request,
      CookieName.KeycloakAccessToken,
    );
    const tokenValue = bearerToken ?? cookieToken;
    if (!tokenValue) throw new UnauthorizedException('Bearer token required');

    const cookieAuthenticated = !bearerToken && Boolean(cookieToken);
    if (
      cookieAuthenticated &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
    ) {
      this.cookies.assertCsrfToken(request);
    }

    const token = await this.keycloak.verifyToken(tokenValue);
    const actor: Actor = {
      sub: token.sub,
      email: token.email,
      name: token.name,
      roles: token.roles ?? [],
      email_verified: token.email_verified,
    };

    // 2. Role-based access control (RBAC): check the roles required by the `@Access(['role_name'])` decorator.
    const roles =
      this.reflector.getAllAndOverride<string[]>('lens:roles', targets) ?? [];
    if (roles.length && !roles.some((r) => actor.roles.includes(r)))
      throw new ForbiddenException('Required role missing');

    // 3. Except for the registration endpoint (`@Registration`), every request must have a
    // profile in the `users` table, and the account must be active.
    if (!this.reflector.getAllAndOverride('lens:registration', targets))
      await currentUser(this.dataSource.manager, actor);
    request.actor = actor;
    return true;
  }
}
