import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { AiReplySuggestionsApiModule } from './ai-reply-suggestions-api.module';
import { PhotographerController } from '../http/photographer.controller';
import { BookingPlanController } from '../http/booking-plan.controller';
import { RankController } from '../http/rank.controller';
import { BadgeController } from '../http/badge.controller';
import { RankUpdateCommandHandler } from '@modules/photographer/rank/ranks.command';
import { RankListQueryHandler } from '@modules/photographer/rank/ranks.query';
import { BadgeUpdateCommandHandler } from '@modules/photographer/badge/badges.command';
import { BadgeListQueryHandler } from '@modules/photographer/badge/badges.query';
import {
  BookingPlanCreateCommandHandler,
  BookingPlanRemoveCommandHandler,
  BookingPlanUpdateCommandHandler,
} from '@modules/photographer/booking-plan/booking-plans.command';
import {
  BookingPlanListQueryHandler,
  BookingPlanMeQueryHandler,
} from '@modules/photographer/booking-plan/booking-plans.query';
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
  PhotographerChatPeerQueryHandler,
  PhotographerEarningsQueryHandler,
  PhotographerGetQueryHandler,
  PhotographerMeQueryHandler,
  PhotographerSearchQueryHandler,
  PhotographerStylesFeaturedQueryHandler,
  PhotographerTopQueryHandler,
} from '@modules/photographer/photographers.query';

@Module({
  imports: [
    ConditionalModule.registerWhen(
      AiReplySuggestionsApiModule,
      (env) => env.AI_API_ENABLED === 'true',
      { debug: false },
    ),
  ],
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
    PhotographerChatPeerQueryHandler,
    PhotographerEarningsQueryHandler,
    PhotographerGetQueryHandler,
    PhotographerMeQueryHandler,
    PhotographerSearchQueryHandler,
    PhotographerStylesFeaturedQueryHandler,
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
