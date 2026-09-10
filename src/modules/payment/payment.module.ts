import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentUseCases } from './application/payments';
import {
  PaymentDepositCommandHandler,
  PaymentRemainingCommandHandler,
  PaymentRefundCommandHandler,
  PaymentWebhookCommandHandler,
} from './application/commands/payments';
import {
  PaymentAdminQueryHandler,
  PaymentHistoryQueryHandler,
  PaymentQrQueryHandler,
  PaymentRefundsQueryHandler,
  PaymentGetQueryHandler,
} from './application/queries/payments';

const CommandHandlers = [
  PaymentDepositCommandHandler,
  PaymentRemainingCommandHandler,
  PaymentRefundCommandHandler,
  PaymentWebhookCommandHandler,
];

const QueryHandlers = [
  PaymentAdminQueryHandler,
  PaymentHistoryQueryHandler,
  PaymentQrQueryHandler,
  PaymentRefundsQueryHandler,
  PaymentGetQueryHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [PaymentUseCases, ...CommandHandlers, ...QueryHandlers],
  exports: [PaymentUseCases],
})
export class PaymentModule {}
