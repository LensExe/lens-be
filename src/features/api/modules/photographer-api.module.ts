import { Module } from '@nestjs/common';
import { PhotographerController } from '../http/photographer.controller';
import { BookingPlanController } from '../http/booking-plan.controller';
import {
  BookingPlanCreateCommandHandler,
  BookingPlanRemoveCommandHandler,
  BookingPlanUpdateCommandHandler,
} from '@modules/photographer/booking-plans.command';
import {
  BookingPlanListQueryHandler,
  BookingPlanMeQueryHandler,
} from '@modules/photographer/booking-plans.query';
import { PhotographerBadgeJob } from '../../workers/photographer-badge.job';
import {
  PhotographerApproveCommandHandler,
  PhotographerAwardBadgesCommandHandler,
  PhotographerCreateCommandHandler,
  PhotographerRejectCommandHandler,
  PhotographerLocationCommandHandler,
  PhotographerStatusCommandHandler,
  PhotographerUpdateCommandHandler,
} from '@modules/photographer/photographers.command';
import {
  PhotographerAdminQueryHandler,
  PhotographerGetQueryHandler,
  PhotographerMeQueryHandler,
  PhotographerSearchQueryHandler,
  PhotographerTopQueryHandler,
} from '@modules/photographer/photographers.query';

@Module({
  controllers: [PhotographerController, BookingPlanController],
  providers: [
    PhotographerApproveCommandHandler,
    PhotographerAwardBadgesCommandHandler,
    PhotographerBadgeJob,
    PhotographerCreateCommandHandler,
    PhotographerRejectCommandHandler,
    PhotographerLocationCommandHandler,
    PhotographerStatusCommandHandler,
    PhotographerUpdateCommandHandler,
    PhotographerAdminQueryHandler,
    PhotographerGetQueryHandler,
    PhotographerMeQueryHandler,
    PhotographerSearchQueryHandler,
    PhotographerTopQueryHandler,
    BookingPlanCreateCommandHandler,
    BookingPlanRemoveCommandHandler,
    BookingPlanUpdateCommandHandler,
    BookingPlanListQueryHandler,
    BookingPlanMeQueryHandler,
  ],
})
export class PhotographerApiModule {}
