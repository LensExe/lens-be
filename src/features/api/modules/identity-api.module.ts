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
} from '@modules/identity/identity.command';
import {
  IdentityAdminUserQueryHandler,
  IdentityAdminUsersQueryHandler,
  IdentityGetUserQueryHandler,
  IdentityMeQueryHandler,
} from '@modules/identity/identity.query';
import { GoogleAuthService } from '../auth/google-auth.service';

@Module({
  controllers: [
    AuthController,
    UserController,
    AdminUserController,
    GoogleAuthController,
  ],
  providers: [
    GoogleAuthService,
    IdentityAdminBanCommandHandler,
    IdentityRegisterCommandHandler,
    IdentityStatusCommandHandler,
    IdentitySuspendCommandHandler,
    IdentityUnsuspendCommandHandler,
    IdentityUpdateMeCommandHandler,
    IdentityAdminUserQueryHandler,
    IdentityAdminUsersQueryHandler,
    IdentityGetUserQueryHandler,
    IdentityMeQueryHandler,
  ],
})
export class IdentityApiModule {}
