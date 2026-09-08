import { Injectable } from '@nestjs/common';
import type { IWorkingSlotRepository } from '../../domain/repositories/working-slot.repository.interface';
import { WorkingSlotDomainEntity } from '../../domain/entities/working-slot.domain-entity';
import { WorkingSlotOrmEntity } from '../entities/working-slot.orm-entity';
import { WorkingSlotMapper } from '../mappers/working-slot.mapper';

@Injectable()
export class WorkingSlotRepository implements IWorkingSlotRepository {
  private readonly databaseTable: Map<string, WorkingSlotOrmEntity> = new Map();

  findById(id: string): Promise<WorkingSlotDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(WorkingSlotMapper.toDomain(orm));
  }

  findByPhotographerId(
    photographerId: string,
  ): Promise<WorkingSlotDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (s) => s.photographerId === photographerId,
    );
    return Promise.resolve(orms.map((orm) => WorkingSlotMapper.toDomain(orm)));
  }

  save(slot: WorkingSlotDomainEntity): Promise<WorkingSlotDomainEntity> {
    const orm = WorkingSlotMapper.toOrm(slot);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(WorkingSlotMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
