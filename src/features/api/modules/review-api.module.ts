import { Module } from '@nestjs/common';
import { ReviewController } from '../http/feedback.controller';
import {
  ReviewCreateCommandHandler,
  ReviewRemoveCommandHandler,
  ReviewUpdateCommandHandler,
} from '@modules/feedback/application/commands/reviews';
import {
  ReviewListQueryHandler,
  ReviewSummaryQueryHandler,
} from '@modules/feedback/application/queries/reviews';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewCreateCommandHandler,
    ReviewRemoveCommandHandler,
    ReviewUpdateCommandHandler,
    ReviewListQueryHandler,
    ReviewSummaryQueryHandler,
  ],
})
export class ReviewApiModule {}
