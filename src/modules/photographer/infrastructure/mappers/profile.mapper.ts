import { ProfileDomainEntity } from '../../domain/entities/profile.domain-entity';
import { ProfileOrmEntity } from '../entities/profile.orm-entity';

export class ProfileMapper {
  static toDomain(orm: ProfileOrmEntity): ProfileDomainEntity {
    return new ProfileDomainEntity({
      id: orm.id,
      photographerId: orm.photographerId,
      images: orm.images,
      description: orm.description,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: ProfileDomainEntity): ProfileOrmEntity {
    const orm = new ProfileOrmEntity();
    orm.id = domain.id;
    orm.photographerId = domain.photographerId;
    orm.images = domain.images;
    orm.description = domain.description;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
