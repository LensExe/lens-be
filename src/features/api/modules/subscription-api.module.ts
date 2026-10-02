import { Module } from '@nestjs/common';
import { SubscriptionController } from '../http/subscription.controller';
import {
  SubscriptionCancelCommandHandler,
  SubscriptionCreateCommandHandler,
  SubscriptionExpireDueCommandHandler,
  SubscriptionResolvePaymentReviewCommandHandler,
  SubscriptionWebhookCommandHandler,
} from '@modules/subscription/subscriptions.command';
import {
  SubscriptionMeQueryHandler,
  SubscriptionHistoryQueryHandler,
  SubscriptionPlansQueryHandler,
  SubscriptionUsageQueryHandler,
} from '@modules/subscription/subscriptions.query';
import { SubscriptionExpireDueJob } from '../../workers/subscription-expire-due.job';

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionCancelCommandHandler,
    SubscriptionCreateCommandHandler,
    SubscriptionExpireDueCommandHandler,
    SubscriptionResolvePaymentReviewCommandHandler,
    SubscriptionWebhookCommandHandler,
    SubscriptionMeQueryHandler,
    SubscriptionHistoryQueryHandler,
    SubscriptionPlansQueryHandler,
    SubscriptionUsageQueryHandler,
    SubscriptionExpireDueJob,
  ],
})
export class SubscriptionApiModule {}
