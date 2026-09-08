import { Injectable } from '@nestjs/common';
import type { IProfileRepository } from '../../domain/repositories/profile.repository.interface';
import { ProfileDomainEntity } from '../../domain/entities/profile.domain-entity';
import { ProfileOrmEntity } from '../entities/profile.orm-entity';
import { ProfileMapper } from '../mappers/profile.mapper';

@Injectable()
export class ProfileRepository implements IProfileRepository {
  private readonly databaseTable: Map<string, ProfileOrmEntity> = new Map();

  findById(id: string): Promise<ProfileDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(ProfileMapper.toDomain(orm));
  }

  findByPhotographerId(
    photographerId: string,
  ): Promise<ProfileDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (p) => p.photographerId === photographerId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(ProfileMapper.toDomain(orm));
  }

  save(profile: ProfileDomainEntity): Promise<ProfileDomainEntity> {
    const orm = ProfileMapper.toOrm(profile);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(ProfileMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
