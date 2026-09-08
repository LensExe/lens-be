import { Injectable } from '@nestjs/common';
import type { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { SubscriptionDomainEntity } from '../../domain/entities/subscription.domain-entity';
import { SubscriptionOrmEntity } from '../entities/subscription.orm-entity';
import { SubscriptionMapper } from '../mappers/subscription.mapper';

@Injectable()
export class SubscriptionRepository implements ISubscriptionRepository {
  private readonly databaseTable: Map<string, SubscriptionOrmEntity> =
    new Map();

  findById(id: string): Promise<SubscriptionDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(SubscriptionMapper.toDomain(orm));
  }

  findByPhotographerId(
    photographerId: string,
  ): Promise<SubscriptionDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (s) => s.photographerId === photographerId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(SubscriptionMapper.toDomain(orm));
  }

  findAll(): Promise<SubscriptionDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => SubscriptionMapper.toDomain(orm)));
  }

  save(
    subscription: SubscriptionDomainEntity,
  ): Promise<SubscriptionDomainEntity> {
    const orm = SubscriptionMapper.toOrm(subscription);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(SubscriptionMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
