import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `feedbacks`.
 * Lưu trữ đánh giá nhận xét của khách hàng và phản hồi chính thức từ nhiếp ảnh gia sau buổi chụp.
 */
@Entity('feedbacks')
export class FeedbackEntity extends BaseEntity {
  /** ID của đơn booking được đánh giá (khóa ngoại duy nhất liên kết `bookings.id`) */
  @Column('uuid', { unique: true })
  booking_id!: string;

  /** ID của khách hàng thực hiện đánh giá (khóa ngoại liên kết `customers.id`) */
  @Column('uuid')
  customer_id!: string;

  /** Điểm đánh giá chất lượng tổng thể (từ 1 đến 5 sao) */
  @Column()
  rating!: number;

  /** Điểm đánh giá độ đúng giờ của thợ ảnh (từ 1 đến 5 sao) */
  @Column()
  punctuality_rating!: number;

  /** Điểm đánh giá thái độ phục vụ và giao tiếp (từ 1 đến 5 sao) */
  @Column()
  attitude_rating!: number;

  /** Nội dung nhận xét bằng lời của khách hàng */
  @Column({ default: '' })
  comment!: string;

  /** Đánh dấu xem nhận xét của khách đã từng qua chỉnh sửa hay chưa */
  @Column({ default: false })
  is_edited!: boolean;

  /** Trạng thái cho phép hiển thị công khai trên trang của thợ ảnh */
  @Column({ default: true })
  is_visible!: boolean;

  // --- PHẢN HỒI CỦA NHIẾP ẢNH GIA (GỘP TỪ REPLIES) ---

  /** Nội dung phản hồi của nhiếp ảnh gia (null nghĩa là chưa phản hồi) */
  @Column('text', { nullable: true })
  photographer_reply!: string | null;

  /** Thời điểm nhiếp ảnh gia gửi phản hồi */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  replied_at!: string | null;
}
