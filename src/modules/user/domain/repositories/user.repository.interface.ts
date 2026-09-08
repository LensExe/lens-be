import { UserDomainEntity } from '../entities/user.domain-entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findById(id: string): Promise<UserDomainEntity | null>;
  findByKeycloakId(keycloakId: string): Promise<UserDomainEntity | null>;
  findByEmail(email: string): Promise<UserDomainEntity | null>;
  findAll(): Promise<UserDomainEntity[]>;
  save(user: UserDomainEntity): Promise<UserDomainEntity>;
  delete(id: string): Promise<void>;
}
