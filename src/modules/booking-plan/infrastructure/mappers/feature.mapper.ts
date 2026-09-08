import { FeatureDomainEntity } from '../../domain/entities/feature.domain-entity';
import { FeatureOrmEntity } from '../entities/feature.orm-entity';

export class FeatureMapper {
  static toDomain(orm: FeatureOrmEntity): FeatureDomainEntity {
    return new FeatureDomainEntity({
      id: orm.id,
      planId: orm.planId,
      code: orm.code,
      name: orm.name,
      value: orm.value,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: FeatureDomainEntity): FeatureOrmEntity {
    const orm = new FeatureOrmEntity();
    orm.id = domain.id;
    orm.planId = domain.planId;
    orm.code = domain.code;
    orm.name = domain.name;
    orm.value = domain.value;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
