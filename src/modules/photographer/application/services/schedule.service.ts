import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WORKING_SLOT_REPOSITORY } from '../../domain/repositories/working-slot.repository.interface';
import type { IWorkingSlotRepository } from '../../domain/repositories/working-slot.repository.interface';
import { OFFLINE_SLOT_REPOSITORY } from '../../domain/repositories/offline-slot.repository.interface';
import type { IOfflineSlotRepository } from '../../domain/repositories/offline-slot.repository.interface';

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(WORKING_SLOT_REPOSITORY)
    private readonly workingSlotRepository: IWorkingSlotRepository,
    @Inject(OFFLINE_SLOT_REPOSITORY)
    private readonly offlineSlotRepository: IOfflineSlotRepository,
  ) {}

  async getWorkingSlots(photographerId: string) {
    return this.workingSlotRepository.findByPhotographerId(photographerId);
  }

  async getOfflineSlots(photographerId: string) {
    return this.offlineSlotRepository.findByPhotographerId(photographerId);
  }

  async deleteWorkingSlot(id: string) {
    const slot = await this.workingSlotRepository.findById(id);
    if (!slot) {
      throw new NotFoundException(`Working slot with ID "${id}" not found.`);
    }
    await this.workingSlotRepository.delete(id);
  }

  async deleteOfflineSlot(id: string) {
    const slot = await this.offlineSlotRepository.findById(id);
    if (!slot) {
      throw new NotFoundException(`Offline slot with ID "${id}" not found.`);
    }
    await this.offlineSlotRepository.delete(id);
  }
}
