import { Module } from '@nestjs/common';
import { UserService } from './application/services/user.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { UserRepository } from './infrastructure/repositories/user.repository';

@Module({
  imports: [],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
