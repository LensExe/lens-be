import { BookingPlanDomainEntity } from '../../domain/entities/booking-plan.domain-entity';
import { BookingPlanOrmEntity } from '../entities/booking-plan.orm-entity';

export class BookingPlanMapper {
  static toDomain(orm: BookingPlanOrmEntity): BookingPlanDomainEntity {
    return new BookingPlanDomainEntity({
      id: orm.id,
      code: orm.code,
      name: orm.name,
      description: orm.description,
      price: orm.price,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: BookingPlanDomainEntity): BookingPlanOrmEntity {
    const orm = new BookingPlanOrmEntity();
    orm.id = domain.id;
    orm.code = domain.code;
    orm.name = domain.name;
    orm.description = domain.description;
    orm.price = domain.price;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
