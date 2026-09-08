import { CustomerDomainEntity } from '../../domain/entities/customer.domain-entity';
import { CustomerOrmEntity } from '../entities/customer.orm-entity';

export class CustomerMapper {
  static toDomain(orm: CustomerOrmEntity): CustomerDomainEntity {
    return new CustomerDomainEntity({
      id: orm.id,
      userId: orm.userId,
      location: orm.location,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: CustomerDomainEntity): CustomerOrmEntity {
    const orm = new CustomerOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.location = domain.location;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
