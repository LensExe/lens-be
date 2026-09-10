import { Module } from '@nestjs/common';
import { CustomerService } from './application/services/customer.service';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer.repository.interface';
import { CustomerRepository } from './infrastructure/repositories/customer.repository';

@Module({
  imports: [],
  providers: [
    CustomerService,
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerRepository,
    },
  ],
  exports: [CustomerService, CUSTOMER_REPOSITORY],
})
export class CustomerModule {}
