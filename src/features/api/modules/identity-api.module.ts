import { Module } from '@nestjs/common';
import { IdentityController } from '../http/user.controller';
import { GoogleAuthController } from '../http/google-auth.controller';
import { GoogleAuthService } from '../auth/google-auth.service';
import {
  IdentityAddDeviceCommandHandler,
  IdentityDeleteDeviceCommandHandler,
  IdentityRegisterCommandHandler,
  IdentityStatusCommandHandler,
  IdentitySuspendCommandHandler,
  IdentityUnsuspendCommandHandler,
  IdentityUpdateMeCommandHandler,
} from '@modules/user/application/commands/identity';
import {
  IdentityAdminUserQueryHandler,
  IdentityAdminUsersQueryHandler,
  IdentityGetUserQueryHandler,
  IdentityMeQueryHandler,
} from '@modules/user/application/queries/identity';

@Module({
  controllers: [IdentityController, GoogleAuthController],
  providers: [
    GoogleAuthService,
    IdentityAddDeviceCommandHandler,
    IdentityDeleteDeviceCommandHandler,
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
