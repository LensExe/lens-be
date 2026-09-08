import { PhotographerDomainEntity } from '../entities/photographer.domain-entity';

export const PHOTOGRAPHER_REPOSITORY = Symbol('PHOTOGRAPHER_REPOSITORY');

export interface IPhotographerRepository {
  findById(id: string): Promise<PhotographerDomainEntity | null>;
  findByUserId(userId: string): Promise<PhotographerDomainEntity | null>;
  findAll(): Promise<PhotographerDomainEntity[]>;
  save(
    photographer: PhotographerDomainEntity,
  ): Promise<PhotographerDomainEntity>;
  delete(id: string): Promise<void>;
}
