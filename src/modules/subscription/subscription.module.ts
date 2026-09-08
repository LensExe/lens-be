import { Module } from '@nestjs/common';
import { SubscriptionService } from './application/services/subscription.service';
import { PHOTOGRAPHER_PLAN_REPOSITORY } from './domain/repositories/photographer-plan.repository.interface';
import { PhotographerPlanRepository } from './infrastructure/repositories/photographer-plan.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/repositories/subscription.repository.interface';
import { SubscriptionRepository } from './infrastructure/repositories/subscription.repository';

@Module({
  imports: [],
  providers: [
    SubscriptionService,
    {
      provide: PHOTOGRAPHER_PLAN_REPOSITORY,
      useClass: PhotographerPlanRepository,
    },
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useClass: SubscriptionRepository,
    },
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
