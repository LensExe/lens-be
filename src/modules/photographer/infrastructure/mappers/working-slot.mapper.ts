import { WorkingSlotDomainEntity } from '../../domain/entities/working-slot.domain-entity';
import { WorkingSlotOrmEntity } from '../entities/working-slot.orm-entity';

export class WorkingSlotMapper {
  static toDomain(orm: WorkingSlotOrmEntity): WorkingSlotDomainEntity {
    return new WorkingSlotDomainEntity({
      id: orm.id,
      photographerId: orm.photographerId,
      day: orm.day,
      date: orm.date,
      from: orm.from,
      to: orm.to,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: WorkingSlotDomainEntity): WorkingSlotOrmEntity {
    const orm = new WorkingSlotOrmEntity();
    orm.id = domain.id;
    orm.photographerId = domain.photographerId;
    orm.day = domain.day;
    orm.date = domain.date;
    orm.from = domain.from;
    orm.to = domain.to;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
