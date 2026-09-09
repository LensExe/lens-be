import { Module } from '@nestjs/common';
import { SubscriptionController } from '../http/subscription.controller';
import {
  SubscriptionCancelCommandHandler,
  SubscriptionCreateCommandHandler,
  SubscriptionWebhookCommandHandler,
} from '@modules/subscription/application/commands/subscriptions';
import {
  SubscriptionMeQueryHandler,
  SubscriptionPlansQueryHandler,
  SubscriptionUsageQueryHandler,
} from '@modules/subscription/application/queries/subscriptions';

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
