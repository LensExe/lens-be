import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FEEDBACK_REPOSITORY } from '../../domain/repositories/feedback.repository.interface';
import type { IFeedbackRepository } from '../../domain/repositories/feedback.repository.interface';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async findAll() {
    return this.feedbackRepository.findAll();
  }

  async findById(id: string) {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID "${id}" not found.`);
    }
    return feedback;
  }

  async findByBookingId(bookingId: string) {
    return this.feedbackRepository.findByBookingId(bookingId);
  }
}
