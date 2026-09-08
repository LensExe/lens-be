import { Module } from '@nestjs/common';
import { FeedbackService } from './application/services/feedback.service';
import { FEEDBACK_REPOSITORY } from './domain/repositories/feedback.repository.interface';
import { FeedbackRepository } from './infrastructure/repositories/feedback.repository';
import { REPLY_REPOSITORY } from './domain/repositories/reply.repository.interface';
import { ReplyRepository } from './infrastructure/repositories/reply.repository';

@Module({
  imports: [],
  providers: [
    FeedbackService,
    {
      provide: FEEDBACK_REPOSITORY,
      useClass: FeedbackRepository,
    },
    {
      provide: REPLY_REPOSITORY,
      useClass: ReplyRepository,
    },
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
