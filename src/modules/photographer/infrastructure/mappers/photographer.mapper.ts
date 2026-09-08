import { PhotographerDomainEntity } from '../../domain/entities/photographer.domain-entity';
import { PhotographerOrmEntity } from '../entities/photographer.orm-entity';

export class PhotographerMapper {
  static toDomain(orm: PhotographerOrmEntity): PhotographerDomainEntity {
    return new PhotographerDomainEntity({
      id: orm.id,
      userId: orm.userId,
      taxCode: orm.taxCode,
      styles: orm.styles,
      experience: orm.experience,
      isVerified: orm.isVerified,
      approvedBy: orm.approvedBy,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: PhotographerDomainEntity): PhotographerOrmEntity {
    const orm = new PhotographerOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.taxCode = domain.taxCode;
    orm.styles = domain.styles;
    orm.experience = domain.experience;
    orm.isVerified = domain.isVerified;
    orm.approvedBy = domain.approvedBy;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
