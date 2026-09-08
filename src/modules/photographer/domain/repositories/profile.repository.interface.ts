import { ProfileDomainEntity } from '../entities/profile.domain-entity';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface IProfileRepository {
  findById(id: string): Promise<ProfileDomainEntity | null>;
  findByPhotographerId(
    photographerId: string,
  ): Promise<ProfileDomainEntity | null>;
  save(profile: ProfileDomainEntity): Promise<ProfileDomainEntity>;
  delete(id: string): Promise<void>;
}
