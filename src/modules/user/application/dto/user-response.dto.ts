import { UserStatus } from '../../domain/enums/user-status.enum';
import { UserDomainEntity } from '../../domain/entities/user.domain-entity';
import { Gender } from '../../domain/enums/gender.enum';

export class UserResponseDto {
  id: string;
  keycloakId: string;
  fullname: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: Gender;
  dob?: Date;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(entity: UserDomainEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.keycloakId = entity.keycloakId;
    dto.fullname = entity.fullname;
    dto.email = entity.email;
    dto.phoneNumber = entity.phoneNumber;
    dto.avatarUrl = entity.avatarUrl;
    dto.gender = entity.gender;
    dto.dob = entity.dob;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
