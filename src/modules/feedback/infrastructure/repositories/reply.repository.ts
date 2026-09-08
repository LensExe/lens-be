import { Injectable } from '@nestjs/common';
import type { IReplyRepository } from '../../domain/repositories/reply.repository.interface';
import { ReplyDomainEntity } from '../../domain/entities/reply.domain-entity';
import { ReplyOrmEntity } from '../entities/reply.orm-entity';
import { ReplyMapper } from '../mappers/reply.mapper';

@Injectable()
export class ReplyRepository implements IReplyRepository {
  private readonly databaseTable: Map<string, ReplyOrmEntity> = new Map();

  findById(id: string): Promise<ReplyDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(ReplyMapper.toDomain(orm));
  }

  findByFeedbackId(feedbackId: string): Promise<ReplyDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (r) => r.feedbackId === feedbackId,
    );
    return Promise.resolve(orms.map((orm) => ReplyMapper.toDomain(orm)));
  }

  save(reply: ReplyDomainEntity): Promise<ReplyDomainEntity> {
    const orm = ReplyMapper.toOrm(reply);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(ReplyMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
