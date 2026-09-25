import { Module } from '@nestjs/common';
import { PhotographerController } from '../http/photographer.controller';
import { BookingPlanController } from '../http/booking-plan.controller';
import { RankController } from '../http/rank.controller';
import { BadgeController } from '../http/badge.controller';
import { RankUpdateCommandHandler } from '@modules/photographer/ranks.command';
import { RankListQueryHandler } from '@modules/photographer/ranks.query';
import { BadgeUpdateCommandHandler } from '@modules/photographer/badges.command';
import { BadgeListQueryHandler } from '@modules/photographer/badges.query';
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
  controllers: [
    PhotographerController,
    BookingPlanController,
    RankController,
    BadgeController,
  ],
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
    RankUpdateCommandHandler,
    RankListQueryHandler,
    BadgeUpdateCommandHandler,
    BadgeListQueryHandler,
  ],
})
export class PhotographerApiModule {}
