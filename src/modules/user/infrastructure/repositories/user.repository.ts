import { Injectable } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserDomainEntity } from '../../domain/entities/user.domain-entity';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly databaseTable: Map<string, UserOrmEntity> = new Map();

  findById(id: string): Promise<UserDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(UserMapper.toDomain(orm));
  }

  findByKeycloakId(keycloakId: string): Promise<UserDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (u) => u.keycloakId === keycloakId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(UserMapper.toDomain(orm));
  }

  findByEmail(email: string): Promise<UserDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (u) => u.email === email,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(UserMapper.toDomain(orm));
  }

  findAll(): Promise<UserDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => UserMapper.toDomain(orm)));
  }

  save(user: UserDomainEntity): Promise<UserDomainEntity> {
    const orm = UserMapper.toOrm(user);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(UserMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
