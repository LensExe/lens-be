import { Injectable } from '@nestjs/common';
import type { IOfflineSlotRepository } from '../../domain/repositories/offline-slot.repository.interface';
import { OfflineSlotDomainEntity } from '../../domain/entities/offline-slot.domain-entity';
import { OfflineSlotOrmEntity } from '../entities/offline-slot.orm-entity';
import { OfflineSlotMapper } from '../mappers/offline-slot.mapper';

@Injectable()
export class OfflineSlotRepository implements IOfflineSlotRepository {
  private readonly databaseTable: Map<string, OfflineSlotOrmEntity> = new Map();

  findById(id: string): Promise<OfflineSlotDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(OfflineSlotMapper.toDomain(orm));
  }

  findByPhotographerId(
    photographerId: string,
  ): Promise<OfflineSlotDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (s) => s.photographerId === photographerId,
    );
    return Promise.resolve(orms.map((orm) => OfflineSlotMapper.toDomain(orm)));
  }

  save(slot: OfflineSlotDomainEntity): Promise<OfflineSlotDomainEntity> {
    const orm = OfflineSlotMapper.toOrm(slot);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(OfflineSlotMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
