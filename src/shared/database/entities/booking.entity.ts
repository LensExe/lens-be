import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  bigintColumn,
  timestampTransformer,
} from './utils/column-transformers';
import { BookingStatus } from '@shared/domain/values/booking.values';

/**
 * Entity đại diện cho bảng `bookings`.
 * Bảng nghiệp vụ cốt lõi quản lý thông tin các đơn đặt lịch thuê chụp ảnh giữa Khách hàng và Nhiếp ảnh gia.
 */
@Entity('bookings')
export class BookingEntity extends BaseEntity {
  /** ID của khách hàng đặt lịch (khóa ngoại liên kết tới `customers.id`) */
  @Column('uuid')
  customer_id!: string;

  /** Photographer duy nhất chịu trách nhiệm cho booking (khóa ngoại `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** ID gói chụp được chọn (khóa ngoại liên kết tới `booking_plans.id`) */
  @Column('uuid')
  booking_plan_id!: string;

  /** Địa điểm diễn ra buổi chụp ảnh */
  @Column()
  location!: string;

  /** Thời gian bắt đầu buổi chụp (ISO timestamptz string) */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  from!: string;

  /** Thời gian dự kiến kết thúc buổi chụp (ISO timestamptz string) */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  to!: string;

  /** Số tiền đặt cọc cần thanh toán trước (VND) */
  @Column(bigintColumn)
  deposit_amount!: number;

  /** Tổng giá trị hợp đồng của đơn booking (VND) */
  @Column(bigintColumn)
  total_amount!: number;

  /** Trạng thái đơn booking ('pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'in_progress' | 'shot' | 'completed') */
  @Column({ default: BookingStatus.PENDING })
  status!: import('@shared/domain/values/booking.values').BookingStatus;

  /** Lúc thợ nhận booking; tính hạn thanh toán cọc từ mốc này. `null` khi chưa được nhận */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  accepted_at!: string | null;

  /** Thời điểm album ảnh sản phẩm được bàn giao và công khai cho khách xem */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  gallery_published_at!: string | null;
}
