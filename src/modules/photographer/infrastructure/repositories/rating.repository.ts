import { Injectable } from '@nestjs/common';
import type { IRatingRepository } from '../../domain/repositories/rating.repository.interface';
import { RatingDomainEntity } from '../../domain/entities/rating.domain-entity';
import { RatingOrmEntity } from '../entities/rating.orm-entity';
import { RatingMapper } from '../mappers/rating.mapper';

@Injectable()
export class RatingRepository implements IRatingRepository {
  private readonly databaseTable: Map<string, RatingOrmEntity> = new Map();

  findById(id: string): Promise<RatingDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(RatingMapper.toDomain(orm));
  }

  findByPhotographerId(
    photographerId: string,
  ): Promise<RatingDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (r) => r.photographerId === photographerId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(RatingMapper.toDomain(orm));
  }

  save(rating: RatingDomainEntity): Promise<RatingDomainEntity> {
    const orm = RatingMapper.toOrm(rating);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(RatingMapper.toDomain(orm));
  }
}
