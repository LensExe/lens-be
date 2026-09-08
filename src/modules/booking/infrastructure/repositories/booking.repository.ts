import { Injectable } from '@nestjs/common';
import type { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { BookingDomainEntity } from '../../domain/entities/booking.domain-entity';
import { BookingOrmEntity } from '../entities/booking.orm-entity';
import { BookingMapper } from '../mappers/booking.mapper';

@Injectable()
export class BookingRepository implements IBookingRepository {
  /**
   * Giả lập Database Table 'bookings' lưu trữ BookingOrmEntity.
   * Sau này khi kết nối PostgreSQL/TypeORM thật, bạn chỉ cần thay thế Map này
   * bằng: private readonly ormRepo: Repository<BookingOrmEntity>
   */
  private readonly databaseTable: Map<string, BookingOrmEntity> = new Map();

  findById(id: string): Promise<BookingDomainEntity | null> {
    const ormEntity = this.databaseTable.get(id);
    if (!ormEntity) {
      return Promise.resolve(null);
    }
    // 👈 Sử dụng Mapper chuyển từ ORM Entity sang Domain Entity
    const domainEntity = BookingMapper.toDomain(ormEntity);
    return Promise.resolve(domainEntity);
  }

  findAll(): Promise<BookingDomainEntity[]> {
    const ormEntities = Array.from(this.databaseTable.values());
    // 👈 Sử dụng Mapper chuyển danh sách ORM Entities sang Domain Entities
    const domainEntities = ormEntities.map((orm) =>
      BookingMapper.toDomain(orm),
    );
    return Promise.resolve(domainEntities);
  }

  save(booking: BookingDomainEntity): Promise<BookingDomainEntity> {
    // 👈 Sử dụng Mapper chuyển từ Domain Entity sang ORM Entity để lưu Database
    const ormEntity = BookingMapper.toOrm(booking);
    this.databaseTable.set(ormEntity.id, ormEntity);

    // Trả về Domain Entity sau khi lưu
    const savedDomain = BookingMapper.toDomain(ormEntity);
    return Promise.resolve(savedDomain);
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
