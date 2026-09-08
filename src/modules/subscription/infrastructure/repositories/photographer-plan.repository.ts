import { Injectable } from '@nestjs/common';
import type { IPhotographerPlanRepository } from '../../domain/repositories/photographer-plan.repository.interface';
import { PhotographerPlanDomainEntity } from '../../domain/entities/photographer-plan.domain-entity';
import { PhotographerPlanOrmEntity } from '../entities/photographer-plan.orm-entity';
import { PhotographerPlanMapper } from '../mappers/photographer-plan.mapper';

@Injectable()
export class PhotographerPlanRepository implements IPhotographerPlanRepository {
  private readonly databaseTable: Map<string, PhotographerPlanOrmEntity> =
    new Map();

  findById(id: string): Promise<PhotographerPlanDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(PhotographerPlanMapper.toDomain(orm));
  }

  findByCode(code: string): Promise<PhotographerPlanDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (p) => p.code === code,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(PhotographerPlanMapper.toDomain(orm));
  }

  findAll(): Promise<PhotographerPlanDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(
      orms.map((orm) => PhotographerPlanMapper.toDomain(orm)),
    );
  }

  save(
    plan: PhotographerPlanDomainEntity,
  ): Promise<PhotographerPlanDomainEntity> {
    const orm = PhotographerPlanMapper.toOrm(plan);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(PhotographerPlanMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
