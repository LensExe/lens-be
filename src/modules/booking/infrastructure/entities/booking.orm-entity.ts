import { BookingStatus } from '../../domain/enums/booking-status.enum';

/**
 * Định nghĩa cấu trúc bảng booking trong Database.
 * Sau này khi tích hợp TypeORM, bạn chỉ cần gắn thêm decorator @Entity('bookings'), @Column, v.v.
 */
export class BookingOrmEntity {
  id: string;
  userId: string;
  lensId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}
