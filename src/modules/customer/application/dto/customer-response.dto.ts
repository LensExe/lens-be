import { CustomerDomainEntity } from '../../domain/entities/customer.domain-entity';

export class CustomerResponseDto {
  id: string;
  userId: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(entity: CustomerDomainEntity): CustomerResponseDto {
    const dto = new CustomerResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.location = entity.location;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
