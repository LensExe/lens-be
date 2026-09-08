import { Injectable } from '@nestjs/common';
import type { IFeatureRepository } from '../../domain/repositories/feature.repository.interface';
import { FeatureDomainEntity } from '../../domain/entities/feature.domain-entity';
import { FeatureOrmEntity } from '../entities/feature.orm-entity';
import { FeatureMapper } from '../mappers/feature.mapper';

@Injectable()
export class FeatureRepository implements IFeatureRepository {
  private readonly databaseTable: Map<string, FeatureOrmEntity> = new Map();

  findById(id: string): Promise<FeatureDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(FeatureMapper.toDomain(orm));
  }

  findByPlanId(planId: string): Promise<FeatureDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (f) => f.planId === planId,
    );
    return Promise.resolve(orms.map((orm) => FeatureMapper.toDomain(orm)));
  }

  save(feature: FeatureDomainEntity): Promise<FeatureDomainEntity> {
    const orm = FeatureMapper.toOrm(feature);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(FeatureMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
