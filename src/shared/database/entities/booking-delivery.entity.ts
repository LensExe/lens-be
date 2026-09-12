import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `booking_deliveries`.
 * Lưu danh sách các tệp hình ảnh/video sản phẩm bàn giao từ nhiếp ảnh gia cho khách hàng trong đơn booking.
 */
@Entity('booking_deliveries')
export class BookingDeliveryEntity extends BaseEntity {
  /** ID của đơn booking tương ứng (khóa ngoại liên kết tới `bookings.id`) */
  @Column('uuid')
  booking_id!: string;

  /** Tên đợt bàn giao (ví dụ: 'Ảnh gốc JPEG', 'Ảnh đã chỉnh sửa Retouch') */
  @Column({ default: 'Bàn giao ảnh' })
  title!: string;

  /**
   * DANH SÁCH ID CỦA CÁC TỆP MEDIA ĐƯỢC BÀN GIAO (Mảng UUID)
   */
  @Column('jsonb', { default: [] })
  media_ids!: string[];
}
