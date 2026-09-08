import { Injectable } from '@nestjs/common';
import type { IBookingPlanRepository } from '../../domain/repositories/booking-plan.repository.interface';
import { BookingPlanDomainEntity } from '../../domain/entities/booking-plan.domain-entity';
import { BookingPlanOrmEntity } from '../entities/booking-plan.orm-entity';
import { BookingPlanMapper } from '../mappers/booking-plan.mapper';

@Injectable()
export class BookingPlanRepository implements IBookingPlanRepository {
  private readonly databaseTable: Map<string, BookingPlanOrmEntity> = new Map();

  findById(id: string): Promise<BookingPlanDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(BookingPlanMapper.toDomain(orm));
  }

  findByCode(code: string): Promise<BookingPlanDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (p) => p.code === code,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(BookingPlanMapper.toDomain(orm));
  }

  findAll(): Promise<BookingPlanDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => BookingPlanMapper.toDomain(orm)));
  }

  save(plan: BookingPlanDomainEntity): Promise<BookingPlanDomainEntity> {
    const orm = BookingPlanMapper.toOrm(plan);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(BookingPlanMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
