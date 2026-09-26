import { Module } from '@nestjs/common';
import { ReviewController } from '../http/feedback.controller';
import {
  ReviewCreateCommandHandler,
  ReviewRemoveCommandHandler,
  ReviewReplyCommandHandler,
  ReviewRestoreCommandHandler,
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
    ReviewReplyCommandHandler,
    ReviewRestoreCommandHandler,
    ReviewUpdateCommandHandler,
    ReviewListQueryHandler,
    ReviewSummaryQueryHandler,
  ],
})
export class ReviewApiModule {}
