import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PHOTOGRAPHER_REPOSITORY } from '../../domain/repositories/photographer.repository.interface';
import type { IPhotographerRepository } from '../../domain/repositories/photographer.repository.interface';

@Injectable()
export class PhotographerService {
  constructor(
    @Inject(PHOTOGRAPHER_REPOSITORY)
    private readonly photographerRepository: IPhotographerRepository,
  ) {}

  async findAll() {
    return this.photographerRepository.findAll();
  }

  async findById(id: string) {
    const photographer = await this.photographerRepository.findById(id);
    if (!photographer) {
      throw new NotFoundException(`Photographer with ID "${id}" not found.`);
    }
    return photographer;
  }

  async approve(id: string, adminId: string) {
    const photographer = await this.photographerRepository.findById(id);
    if (!photographer) {
      throw new NotFoundException(`Photographer with ID "${id}" not found.`);
    }
    photographer.approve(adminId);
    return this.photographerRepository.save(photographer);
  }
}
