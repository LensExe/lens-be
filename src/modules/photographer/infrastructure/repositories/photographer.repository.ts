import { Injectable } from '@nestjs/common';
import type { IPhotographerRepository } from '../../domain/repositories/photographer.repository.interface';
import { PhotographerDomainEntity } from '../../domain/entities/photographer.domain-entity';
import { PhotographerOrmEntity } from '../entities/photographer.orm-entity';
import { PhotographerMapper } from '../mappers/photographer.mapper';

@Injectable()
export class PhotographerRepository implements IPhotographerRepository {
  private readonly databaseTable: Map<string, PhotographerOrmEntity> =
    new Map();

  findById(id: string): Promise<PhotographerDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(PhotographerMapper.toDomain(orm));
  }

  findByUserId(userId: string): Promise<PhotographerDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (p) => p.userId === userId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(PhotographerMapper.toDomain(orm));
  }

  findAll(): Promise<PhotographerDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => PhotographerMapper.toDomain(orm)));
  }

  save(
    photographer: PhotographerDomainEntity,
  ): Promise<PhotographerDomainEntity> {
    const orm = PhotographerMapper.toOrm(photographer);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(PhotographerMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
