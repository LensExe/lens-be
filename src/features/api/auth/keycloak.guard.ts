import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KeycloakService } from '@shared/integrations/keycloak/keycloak.service';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser } from '@shared/common/access';

export const Access = (roles: string[]) => SetMetadata('lens:roles', roles);
export const Public = () => SetMetadata('lens:public', true);
export const Registration = () => SetMetadata('lens:registration', true);

@Injectable()
export class KeycloakGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly keycloak: KeycloakService,
    private readonly uow: UnitOfWork,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true; // Gateway verifies every event explicitly.
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride('lens:public', targets)) return true;
    const request = context.switchToHttp().getRequest(),
      header = request.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer \S+$/i.test(header))
      throw new UnauthorizedException('Bearer token required');
    const token = await this.keycloak.verifyToken(header.slice(7));
    const actor: Actor = {
      sub: token.sub,
      email: token.email,
      name: token.name,
      roles: token.roles ?? [],
    };
    const roles =
      this.reflector.getAllAndOverride<string[]>('lens:roles', targets) ?? [];
    if (roles.length && !roles.some((r) => actor.roles.includes(r)))
      throw new ForbiddenException('Required role missing');
    if (!this.reflector.getAllAndOverride('lens:registration', targets))
      await this.uow.read((s) => currentUser(s, actor));
    request.actor = actor;
    return true;
  }
}
