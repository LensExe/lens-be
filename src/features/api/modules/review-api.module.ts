import { Module } from '@nestjs/common';
import { ReviewController } from '../http/feedback.controller';
import {
  ReviewCreateCommandHandler,
  ReviewRemoveCommandHandler,
  ReviewUpdateCommandHandler,
} from '@modules/feedback/reviews.command';
import {
  ReviewListQueryHandler,
  ReviewSummaryQueryHandler,
} from '@modules/feedback/reviews.query';

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
