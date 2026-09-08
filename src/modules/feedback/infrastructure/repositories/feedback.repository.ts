import { Injectable } from '@nestjs/common';
import type { IFeedbackRepository } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackDomainEntity } from '../../domain/entities/feedback.domain-entity';
import { FeedbackOrmEntity } from '../entities/feedback.orm-entity';
import { FeedbackMapper } from '../mappers/feedback.mapper';

@Injectable()
export class FeedbackRepository implements IFeedbackRepository {
  private readonly databaseTable: Map<string, FeedbackOrmEntity> = new Map();

  findById(id: string): Promise<FeedbackDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(FeedbackMapper.toDomain(orm));
  }

  findByBookingId(bookingId: string): Promise<FeedbackDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (f) => f.bookingId === bookingId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(FeedbackMapper.toDomain(orm));
  }

  findByCustomerId(customerId: string): Promise<FeedbackDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (f) => f.customerId === customerId,
    );
    return Promise.resolve(orms.map((orm) => FeedbackMapper.toDomain(orm)));
  }

  findAll(): Promise<FeedbackDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => FeedbackMapper.toDomain(orm)));
  }

  save(feedback: FeedbackDomainEntity): Promise<FeedbackDomainEntity> {
    const orm = FeedbackMapper.toOrm(feedback);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(FeedbackMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
