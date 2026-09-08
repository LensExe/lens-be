import { PhotographerPlanDomainEntity } from '../../domain/entities/photographer-plan.domain-entity';
import { PhotographerPlanOrmEntity } from '../entities/photographer-plan.orm-entity';

export class PhotographerPlanMapper {
  static toDomain(
    orm: PhotographerPlanOrmEntity,
  ): PhotographerPlanDomainEntity {
    return new PhotographerPlanDomainEntity({
      id: orm.id,
      code: orm.code,
      name: orm.name,
      description: orm.description,
      price: orm.price,
      isActive: orm.isActive,
      billingCycle: orm.billingCycle,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(
    domain: PhotographerPlanDomainEntity,
  ): PhotographerPlanOrmEntity {
    const orm = new PhotographerPlanOrmEntity();
    orm.id = domain.id;
    orm.code = domain.code;
    orm.name = domain.name;
    orm.description = domain.description;
    orm.price = domain.price;
    orm.isActive = domain.isActive;
    orm.billingCycle = domain.billingCycle;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
