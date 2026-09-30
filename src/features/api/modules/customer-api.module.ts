import { Module } from '@nestjs/common';
import { CustomerController } from '../http/customer.controller';
import { CustomerUpdateCommandHandler } from '@modules/customer/customers.command';
import {
  CustomerAdminGetQueryHandler,
  CustomerMeQueryHandler,
  CustomerAdminListQueryHandler,
  CustomerMyBookingSummaryQueryHandler,
  CustomerRecommendQueryHandler,
} from '@modules/customer/customers.query';

@Module({
  controllers: [CustomerController],
  providers: [
    CustomerUpdateCommandHandler,
    CustomerMeQueryHandler,
    CustomerAdminGetQueryHandler,
    CustomerAdminListQueryHandler,
    CustomerMyBookingSummaryQueryHandler,
    CustomerRecommendQueryHandler,
  ],
})
export class CustomerApiModule {}
