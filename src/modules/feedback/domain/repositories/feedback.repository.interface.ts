import { FeedbackDomainEntity } from '../entities/feedback.domain-entity';

export const FEEDBACK_REPOSITORY = Symbol('FEEDBACK_REPOSITORY');

export interface IFeedbackRepository {
  findById(id: string): Promise<FeedbackDomainEntity | null>;
  findByBookingId(bookingId: string): Promise<FeedbackDomainEntity | null>;
  findByCustomerId(customerId: string): Promise<FeedbackDomainEntity[]>;
  findAll(): Promise<FeedbackDomainEntity[]>;
  save(feedback: FeedbackDomainEntity): Promise<FeedbackDomainEntity>;
  delete(id: string): Promise<void>;
}
