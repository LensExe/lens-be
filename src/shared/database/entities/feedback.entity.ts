import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Trạng thái hiển thị của review. Chỉ `visible` được hiện public và tính vào điểm của thợ.
 * `deleted_by_author`: khách tự xoá, không ai hiện lại được. `hidden_by_admin`: admin ẩn, admin hiện lại được.
 */
export const ReviewStatus = {
  VISIBLE: 'visible',
  DELETED_BY_AUTHOR: 'deleted_by_author',
  HIDDEN_BY_ADMIN: 'hidden_by_admin',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

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

  /** ID hồ sơ thợ được đánh giá (khóa ngoại `photographers.id`), để lọc review theo thợ */
  @Column('uuid')
  photographer_id!: string;

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

  /** Trạng thái hiển thị ('visible' | 'deleted_by_author' | 'hidden_by_admin'), xem `ReviewStatus` */
  @Column({ default: ReviewStatus.VISIBLE })
  status!: ReviewStatus;

  /** Lý do admin ẩn review; `null` khi review không bị admin ẩn (hoặc ẩn từ trước khi có lý do) */
  @Column('text', { nullable: true })
  hidden_reason!: string | null;

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
