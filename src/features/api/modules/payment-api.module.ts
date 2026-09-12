import { Module } from '@nestjs/common';
import { PaymentController } from '../http/payments.controller';
import {
  PaymentDepositCommandHandler,
  PaymentRefundCommandHandler,
  PaymentRemainingCommandHandler,
  PaymentWebhookCommandHandler,
} from '@modules/payment/payments.command';
import {
  PaymentAdminQueryHandler,
  PaymentGetQueryHandler,
  PaymentHistoryQueryHandler,
  PaymentQrQueryHandler,
  PaymentRefundsQueryHandler,
} from '@modules/payment/payments.query';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentDepositCommandHandler,
    PaymentRefundCommandHandler,
    PaymentRemainingCommandHandler,
    PaymentWebhookCommandHandler,
    PaymentAdminQueryHandler,
    PaymentGetQueryHandler,
    PaymentHistoryQueryHandler,
    PaymentQrQueryHandler,
    PaymentRefundsQueryHandler,
  ],
})
export class PaymentApiModule {}
