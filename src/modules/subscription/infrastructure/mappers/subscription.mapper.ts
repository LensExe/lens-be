import { SubscriptionDomainEntity } from '../../domain/entities/subscription.domain-entity';
import { SubscriptionOrmEntity } from '../entities/subscription.orm-entity';

export class SubscriptionMapper {
  static toDomain(orm: SubscriptionOrmEntity): SubscriptionDomainEntity {
    return new SubscriptionDomainEntity({
      id: orm.id,
      photographerId: orm.photographerId,
      planId: orm.planId,
      expiredIn: orm.expiredIn,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: SubscriptionDomainEntity): SubscriptionOrmEntity {
    const orm = new SubscriptionOrmEntity();
    orm.id = domain.id;
    orm.photographerId = domain.photographerId;
    orm.planId = domain.planId;
    orm.expiredIn = domain.expiredIn;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
