import { Module } from '@nestjs/common';
import { UserService } from './application/services/user.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer.repository.interface';
import { CustomerRepository } from './infrastructure/repositories/customer.repository';

@Module({
  imports: [],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
