import { OfflineSlotDomainEntity } from '../entities/offline-slot.domain-entity';

export const OFFLINE_SLOT_REPOSITORY = Symbol('OFFLINE_SLOT_REPOSITORY');

export interface IOfflineSlotRepository {
  findById(id: string): Promise<OfflineSlotDomainEntity | null>;
  findByPhotographerId(
    photographerId: string,
  ): Promise<OfflineSlotDomainEntity[]>;
  save(slot: OfflineSlotDomainEntity): Promise<OfflineSlotDomainEntity>;
  delete(id: string): Promise<void>;
}
