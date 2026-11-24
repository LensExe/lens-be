import { Module } from '@nestjs/common';
import { SubscriptionController } from '../http/subscription.controller';
import {
  SubscriptionCancelCommandHandler,
  SubscriptionCreateCommandHandler,
  SubscriptionExpireDueCommandHandler,
  SubscriptionPlanCreateCommandHandler,
  SubscriptionPlanUpdateCommandHandler,
  SubscriptionResolvePaymentReviewCommandHandler,
  SubscriptionWebhookCommandHandler,
} from '@modules/subscription/subscriptions.command';
import {
  SubscriptionMeQueryHandler,
  SubscriptionHistoryQueryHandler,
  SubscriptionAdminPlansQueryHandler,
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
    SubscriptionPlanCreateCommandHandler,
    SubscriptionPlanUpdateCommandHandler,
    SubscriptionResolvePaymentReviewCommandHandler,
    SubscriptionWebhookCommandHandler,
    SubscriptionMeQueryHandler,
    SubscriptionHistoryQueryHandler,
    SubscriptionAdminPlansQueryHandler,
    SubscriptionPlansQueryHandler,
    SubscriptionUsageQueryHandler,
    SubscriptionExpireDueJob,
  ],
})
export class SubscriptionApiModule {}
