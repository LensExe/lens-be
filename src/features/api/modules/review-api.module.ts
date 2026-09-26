import { Module } from '@nestjs/common';
import { ReviewController } from '../http/feedback.controller';
import {
  ReviewCreateCommandHandler,
  ReviewHideCommandHandler,
  ReviewRemoveCommandHandler,
  ReviewReplyCommandHandler,
  ReviewRestoreCommandHandler,
  ReviewUpdateCommandHandler,
} from '@modules/feedback/reviews.command';
import {
  ReviewAdminListQueryHandler,
  ReviewListQueryHandler,
  ReviewSummaryQueryHandler,
} from '@modules/feedback/reviews.query';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewCreateCommandHandler,
    ReviewHideCommandHandler,
    ReviewRemoveCommandHandler,
    ReviewReplyCommandHandler,
    ReviewRestoreCommandHandler,
    ReviewUpdateCommandHandler,
    ReviewAdminListQueryHandler,
    ReviewListQueryHandler,
    ReviewSummaryQueryHandler,
  ],
})
export class ReviewApiModule {}
