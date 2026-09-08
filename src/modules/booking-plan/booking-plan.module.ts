import { Module } from '@nestjs/common';
import { BookingPlanService } from './application/services/booking-plan.service';
import { BOOKING_PLAN_REPOSITORY } from './domain/repositories/booking-plan.repository.interface';
import { BookingPlanRepository } from './infrastructure/repositories/booking-plan.repository';
import { FEATURE_REPOSITORY } from './domain/repositories/feature.repository.interface';
import { FeatureRepository } from './infrastructure/repositories/feature.repository';

@Module({
  imports: [],
  providers: [
    BookingPlanService,
    {
      provide: BOOKING_PLAN_REPOSITORY,
      useClass: BookingPlanRepository,
    },
    {
      provide: FEATURE_REPOSITORY,
      useClass: FeatureRepository,
    },
  ],
  exports: [BookingPlanService],
})
export class BookingPlanModule {}
