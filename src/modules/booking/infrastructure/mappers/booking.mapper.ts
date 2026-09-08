import { BookingDomainEntity } from '../../domain/entities/booking.domain-entity';
import { BookingOrmEntity } from '../entities/booking.orm-entity';

/**
 * Mapper chịu trách nhiệm chuyển đổi 2 chiều:
 * - toDomain(): Chuyển từ ORM Entity (Database) sang Domain Entity (Business logic).
 * - toOrm(): Chuyển từ Domain Entity sang ORM Entity để lưu vào Database.
 */
export class BookingMapper {
  static toDomain(orm: BookingOrmEntity): BookingDomainEntity {
    return new BookingDomainEntity({
      id: orm.id,
      userId: orm.userId,
      lensId: orm.lensId,
      startTime: orm.startTime,
      endTime: orm.endTime,
      status: orm.status,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: BookingDomainEntity): BookingOrmEntity {
    const orm = new BookingOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.lensId = domain.lensId;
    orm.startTime = domain.startTime;
    orm.endTime = domain.endTime;
    orm.status = domain.status;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
