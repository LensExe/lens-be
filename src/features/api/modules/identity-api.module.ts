import { Module } from '@nestjs/common';
import { AuthController } from '../http/auth.controller';
import { UserController } from '../http/user.controller';
import { AdminUserController } from '../http/admin-user.controller';
import { GoogleAuthController } from '../http/google-auth.controller';
import {
  IdentityAdminBanCommandHandler,
  IdentityRegisterCommandHandler,
  IdentityStatusCommandHandler,
  IdentitySuspendCommandHandler,
  IdentityUnsuspendCommandHandler,
  IdentityUpdateMeCommandHandler,
  IdentityAssignRoleCommandHandler,
  IdentityRevokeRoleCommandHandler,
  IdentityVerifyEmailCommandHandler,
  IdentityForcePasswordResetCommandHandler,
  IdentityLogoutCommandHandler,
} from '@modules/identity/identity.command';
import {
  IdentityChatPeerQueryHandler,
  IdentityAdminUserQueryHandler,
  IdentityAdminUsersQueryHandler,
  IdentityGetUserQueryHandler,
  IdentityMeQueryHandler,
} from '@modules/identity/identity.query';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AuthService } from '../auth/auth.service';
import { AuthCookieSessionService } from '../auth/auth-cookie-session';
import { CookieModule } from '@shared/platform/cookie';

@Module({
  imports: [CookieModule],
  controllers: [
    AuthController,
    UserController,
    AdminUserController,
    GoogleAuthController,
  ],
  providers: [
    AuthService,
    AuthCookieSessionService,
    GoogleAuthService,
    IdentityAdminBanCommandHandler,
    IdentityRegisterCommandHandler,
    IdentityStatusCommandHandler,
    IdentitySuspendCommandHandler,
    IdentityUnsuspendCommandHandler,
    IdentityUpdateMeCommandHandler,
    IdentityAssignRoleCommandHandler,
    IdentityRevokeRoleCommandHandler,
    IdentityVerifyEmailCommandHandler,
    IdentityForcePasswordResetCommandHandler,
    IdentityLogoutCommandHandler,
    IdentityAdminUserQueryHandler,
    IdentityChatPeerQueryHandler,
    IdentityAdminUsersQueryHandler,
    IdentityGetUserQueryHandler,
    IdentityMeQueryHandler,
  ],
})
export class IdentityApiModule {}
