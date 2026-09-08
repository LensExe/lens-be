import { UserDomainEntity } from '../../domain/entities/user.domain-entity';
import { UserOrmEntity } from '../entities/user.orm-entity';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): UserDomainEntity {
    return new UserDomainEntity({
      id: orm.id,
      keycloakId: orm.keycloakId,
      fullname: orm.fullname,
      email: orm.email,
      phoneNumber: orm.phoneNumber,
      avatarUrl: orm.avatarUrl,
      gender: orm.gender,
      dob: orm.dob,
      status: orm.status,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: UserDomainEntity): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = domain.id;
    orm.keycloakId = domain.keycloakId;
    orm.fullname = domain.fullname;
    orm.email = domain.email;
    orm.phoneNumber = domain.phoneNumber;
    orm.avatarUrl = domain.avatarUrl;
    orm.gender = domain.gender;
    orm.dob = domain.dob;
    orm.status = domain.status;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
