import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KeycloakService } from '../keycloak.service';
import { UnitOfWork } from '../../../database/unit-of-work/unit-of-work.port';
import type { Actor } from '../../../database/unit-of-work/unit-of-work.port';
import { currentUser } from '../../../common/access';

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
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    // 1. Nếu route được đánh dấu @Public(), cho phép truy cập ngay mà không cần token
    if (this.reflector.getAllAndOverride('lens:public', targets)) return true;
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      actor?: Actor;
    }>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer \S+$/i.test(header))
      throw new UnauthorizedException('Bearer token required');
    const token = await this.keycloak.verifyToken(header.slice(7));
    const actor: Actor = {
      sub: token.sub,
      email: token.email,
      name: token.name,
      roles: token.roles ?? [],
    };

    // 2. Phân quyền (RBAC): Kiểm tra roles yêu cầu từ decorator @Access(['role_name'])
    const roles =
      this.reflector.getAllAndOverride<string[]>('lens:roles', targets) ?? [];
    if (roles.length && !roles.some((r) => actor.roles.includes(r)))
      throw new ForbiddenException('Required role missing');

    // 3. Ngoại trừ endpoint đăng ký (@Registration), tất cả request khác đều phải có
    // profile tồn tại trong bảng users và tài khoản đang ở trạng thái active
    if (!this.reflector.getAllAndOverride('lens:registration', targets))
      await this.uow.read((s) => currentUser(s, actor));
    request.actor = actor;
    return true;
  }
}
