import { BookingStatus } from '../../domain/enums/booking-status.enum';
import { BookingDomainEntity } from '../../domain/entities/booking.domain-entity';

export class BookingResponseDto {
  id: string;
  userId: string;
  lensId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(entity: BookingDomainEntity): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.lensId = entity.lensId;
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
