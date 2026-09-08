import { RatingDomainEntity } from '../../domain/entities/rating.domain-entity';
import { RatingOrmEntity } from '../entities/rating.orm-entity';

export class RatingMapper {
  static toDomain(orm: RatingOrmEntity): RatingDomainEntity {
    return new RatingDomainEntity({
      id: orm.id,
      photographerId: orm.photographerId,
      averageRating: orm.averageRating,
      totalFeedbacks: orm.totalFeedbacks,
      totalBookings: orm.totalBookings,
      returnCustomers: orm.returnCustomers,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: RatingDomainEntity): RatingOrmEntity {
    const orm = new RatingOrmEntity();
    orm.id = domain.id;
    orm.photographerId = domain.photographerId;
    orm.averageRating = domain.averageRating;
    orm.totalFeedbacks = domain.totalFeedbacks;
    orm.totalBookings = domain.totalBookings;
    orm.returnCustomers = domain.returnCustomers;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
