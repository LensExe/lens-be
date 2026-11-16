import { Module } from '@nestjs/common';
import { PaymentController } from '../http/payments.controller';
import { MobileCheckoutController } from '../http/mobile-checkout.controller';
import { PayOsStandaloneTestController } from '../http/payos-standalone-test.controller';
import { MobileCheckoutSessionGuard } from '../payment-handoff/mobile-checkout-session.guard';
import { MobileCheckoutHandoffService } from '../payment-handoff/mobile-checkout-handoff.service';
import { RedisModule } from '@shared/database/redis/redis.module';
import { CookieModule } from '@shared/platform/cookie';
import {
  PaymentDepositCommandHandler,
  PaymentExtendEscrowReleaseCommandHandler,
  PaymentExpireDueCheckoutsCommandHandler,
  PaymentRemainingCommandHandler,
  PaymentReleaseDueEscrowCommandHandler,
  PaymentWebhookCommandHandler,
} from '@modules/payment/payment.command';
import { PaymentEscrowReleaseJob } from '../../workers/payment-escrow-release.job';
import { PaymentCheckoutExpiryJob } from '../../workers/payment-checkout-expiry.job';
import { PaymentRequestSlaJob } from '../../workers/payment-request-sla.job';
import {
  PaymentSavePayoutDestinationCommandHandler,
  PaymentTopUpCommandHandler,
  PaymentWithdrawalCommandHandler,
} from '@modules/payment/wallet/wallet.command';
import {
  PaymentRefundCommandHandler,
  PaymentCustomerRefundCommandHandler,
  PaymentApproveRefundCommandHandler,
  PaymentRejectRefundCommandHandler,
  PaymentCompleteRefundCommandHandler,
  PaymentExtendRequestDeadlineCommandHandler,
  PaymentProcessRequestSlaCommandHandler,
} from '@modules/payment/refund/refund.command';
import {
  PaymentAdminQueryHandler,
  PaymentGetQueryHandler,
  PaymentHistoryQueryHandler,
  PaymentQrQueryHandler,
} from '@modules/payment/transaction/transaction.query';
import {
  PaymentPayoutDestinationQueryHandler,
  PaymentWalletQueryHandler,
  PaymentWalletLedgerQueryHandler,
} from '@modules/payment/wallet/wallet.query';
import {
  PaymentRefundsQueryHandler,
  PaymentAdminRefundsQueryHandler,
  PaymentMyRefundsQueryHandler,
} from '@modules/payment/refund/refund.query';

@Module({
  imports: [RedisModule, CookieModule],
  controllers: [
    PaymentController,
    MobileCheckoutController,
    PayOsStandaloneTestController,
  ],
  providers: [
    MobileCheckoutHandoffService,
    MobileCheckoutSessionGuard,
    PaymentDepositCommandHandler,
    PaymentExtendEscrowReleaseCommandHandler,
    PaymentExpireDueCheckoutsCommandHandler,
    PaymentRemainingCommandHandler,
    PaymentReleaseDueEscrowCommandHandler,
    PaymentWebhookCommandHandler,
    PaymentEscrowReleaseJob,
    PaymentCheckoutExpiryJob,
    PaymentRequestSlaJob,
    PaymentTopUpCommandHandler,
    PaymentSavePayoutDestinationCommandHandler,
    PaymentWithdrawalCommandHandler,
    PaymentRefundCommandHandler,
    PaymentCustomerRefundCommandHandler,
    PaymentApproveRefundCommandHandler,
    PaymentRejectRefundCommandHandler,
    PaymentCompleteRefundCommandHandler,
    PaymentExtendRequestDeadlineCommandHandler,
    PaymentProcessRequestSlaCommandHandler,
    PaymentAdminQueryHandler,
    PaymentGetQueryHandler,
    PaymentHistoryQueryHandler,
    PaymentQrQueryHandler,
    PaymentWalletQueryHandler,
    PaymentWalletLedgerQueryHandler,
    PaymentPayoutDestinationQueryHandler,
    PaymentRefundsQueryHandler,
    PaymentAdminRefundsQueryHandler,
    PaymentMyRefundsQueryHandler,
  ],
})
export class PaymentApiModule {}
