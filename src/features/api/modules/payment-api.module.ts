import { Module } from '@nestjs/common';
import { PaymentController } from '../http/payments.controller';
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
  PaymentWalletQueryHandler,
  PaymentWalletLedgerQueryHandler,
} from '@modules/payment/wallet/wallet.query';
import {
  PaymentRefundsQueryHandler,
  PaymentAdminRefundsQueryHandler,
  PaymentMyRefundsQueryHandler,
} from '@modules/payment/refund/refund.query';

@Module({
  controllers: [PaymentController],
  providers: [
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
    PaymentRefundsQueryHandler,
    PaymentAdminRefundsQueryHandler,
    PaymentMyRefundsQueryHandler,
  ],
})
export class PaymentApiModule {}
