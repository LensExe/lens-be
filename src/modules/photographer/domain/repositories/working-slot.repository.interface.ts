import { WorkingSlotDomainEntity } from '../entities/working-slot.domain-entity';

export const WORKING_SLOT_REPOSITORY = Symbol('WORKING_SLOT_REPOSITORY');

export interface IWorkingSlotRepository {
  findById(id: string): Promise<WorkingSlotDomainEntity | null>;
  findByPhotographerId(
    photographerId: string,
  ): Promise<WorkingSlotDomainEntity[]>;
  save(slot: WorkingSlotDomainEntity): Promise<WorkingSlotDomainEntity>;
  delete(id: string): Promise<void>;
}
