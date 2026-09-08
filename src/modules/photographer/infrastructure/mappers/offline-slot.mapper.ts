import { OfflineSlotDomainEntity } from '../../domain/entities/offline-slot.domain-entity';
import { OfflineSlotOrmEntity } from '../entities/offline-slot.orm-entity';

export class OfflineSlotMapper {
  static toDomain(orm: OfflineSlotOrmEntity): OfflineSlotDomainEntity {
    return new OfflineSlotDomainEntity({
      id: orm.id,
      photographerId: orm.photographerId,
      from: orm.from,
      to: orm.to,
      day: orm.day,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: OfflineSlotDomainEntity): OfflineSlotOrmEntity {
    const orm = new OfflineSlotOrmEntity();
    orm.id = domain.id;
    orm.photographerId = domain.photographerId;
    orm.from = domain.from;
    orm.to = domain.to;
    orm.day = domain.day;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
