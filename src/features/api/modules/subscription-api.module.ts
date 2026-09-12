import { Module } from '@nestjs/common';
import { SubscriptionController } from '../http/subscription.controller';
import {
  SubscriptionCancelCommandHandler,
  SubscriptionCreateCommandHandler,
  SubscriptionWebhookCommandHandler,
} from '@modules/subscription/subscriptions.command';
import {
  SubscriptionMeQueryHandler,
  SubscriptionPlansQueryHandler,
  SubscriptionUsageQueryHandler,
} from '@modules/subscription/subscriptions.query';

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionCancelCommandHandler,
    SubscriptionCreateCommandHandler,
    SubscriptionWebhookCommandHandler,
    SubscriptionMeQueryHandler,
    SubscriptionPlansQueryHandler,
    SubscriptionUsageQueryHandler,
  ],
})
export class SubscriptionApiModule {}
