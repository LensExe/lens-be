import { FeedbackDomainEntity } from '../../domain/entities/feedback.domain-entity';
import { FeedbackOrmEntity } from '../entities/feedback.orm-entity';

export class FeedbackMapper {
  static toDomain(orm: FeedbackOrmEntity): FeedbackDomainEntity {
    return new FeedbackDomainEntity({
      id: orm.id,
      bookingId: orm.bookingId,
      customerId: orm.customerId,
      rating: orm.rating,
      punctualityRating: orm.punctualityRating,
      attitudeRating: orm.attitudeRating,
      comment: orm.comment,
      isEdited: orm.isEdited,
      isVisible: orm.isVisible,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: FeedbackDomainEntity): FeedbackOrmEntity {
    const orm = new FeedbackOrmEntity();
    orm.id = domain.id;
    orm.bookingId = domain.bookingId;
    orm.customerId = domain.customerId;
    orm.rating = domain.rating;
    orm.punctualityRating = domain.punctualityRating;
    orm.attitudeRating = domain.attitudeRating;
    orm.comment = domain.comment;
    orm.isEdited = domain.isEdited;
    orm.isVisible = domain.isVisible;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
