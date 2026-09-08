import { ReplyDomainEntity } from '../../domain/entities/reply.domain-entity';
import { ReplyOrmEntity } from '../entities/reply.orm-entity';

export class ReplyMapper {
  static toDomain(orm: ReplyOrmEntity): ReplyDomainEntity {
    return new ReplyDomainEntity({
      id: orm.id,
      feedbackId: orm.feedbackId,
      comment: orm.comment,
      isVisible: orm.isVisible,
      isEdited: orm.isEdited,
      repliedBy: orm.repliedBy,
      createdAt: orm.createdAt,
    });
  }

  static toOrm(domain: ReplyDomainEntity): ReplyOrmEntity {
    const orm = new ReplyOrmEntity();
    orm.id = domain.id;
    orm.feedbackId = domain.feedbackId;
    orm.comment = domain.comment;
    orm.isVisible = domain.isVisible;
    orm.isEdited = domain.isEdited;
    orm.repliedBy = domain.repliedBy;
    orm.createdAt = domain.createdAt;
    return orm;
  }
}
