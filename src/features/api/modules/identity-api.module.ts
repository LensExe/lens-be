import { Module } from '@nestjs/common';
import { IdentityController } from '../http/user.controller';
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
  controllers: [IdentityController],
  providers: [
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
