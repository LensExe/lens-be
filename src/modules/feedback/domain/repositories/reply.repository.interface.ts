import { ReplyDomainEntity } from '../entities/reply.domain-entity';

export const REPLY_REPOSITORY = Symbol('REPLY_REPOSITORY');

export interface IReplyRepository {
  findById(id: string): Promise<ReplyDomainEntity | null>;
  findByFeedbackId(feedbackId: string): Promise<ReplyDomainEntity[]>;
  save(reply: ReplyDomainEntity): Promise<ReplyDomainEntity>;
  delete(id: string): Promise<void>;
}
