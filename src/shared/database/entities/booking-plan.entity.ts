import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlanFeature } from './photographer-plan.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `booking_plans`.
 * Quản lý các gói dịch vụ chụp ảnh do chính Nhiếp ảnh gia tự thiết lập và niêm yết giá.
 */
@Entity('booking_plans')
export class BookingPlanEntity extends BaseEntity {
  /** ID của thợ ảnh sở hữu và cung cấp gói chụp này (khóa ngoại liên kết `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Tên gói chụp (ví dụ: 'Chụp kỷ yếu cá nhân', 'Chụp phóng sự cưới', 'Chân dung ngoại cảnh') */
  @Column()
  name!: string;

  /** Mô tả chi tiết về gói dịch vụ chụp */
  @Column('text', { nullable: true })
  description!: string | null;

  /** Giá niêm yết của gói dịch vụ do thợ ảnh tự quyết định (VND) */
  @Column(bigintColumn)
  price!: number;

  /** Thời lượng chụp dự kiến (tính theo phút, ví dụ: 60 phút, 120 phút) */
  @Column({ default: 60 })
  duration_minutes!: number;

  /** Số lượng ảnh thợ ảnh cam kết bàn giao cho khách */
  @Column({ default: 20 })
  photo_count!: number;

  /** Số lượng ảnh được chỉnh sửa/retouch chi tiết */
  @Column({ default: 5 })
  retouched_photo_count!: number;

  /**
   * Danh sách các quyền lợi hoặc ghi chú bổ sung đi kèm gói chụp (mảng chuỗi)
   * Ví dụ: ["Hỗ trợ 1 bộ trang phục", "Miễn phí trang điểm nhẹ", "Trả ảnh sau 3 ngày"]
   */
  @Column('jsonb', { default: [] })
  features!: PlanFeature[];

  /** Trạng thái gói dịch vụ còn nhận khách hay tạm đóng */
  @Column({ default: true })
  is_active!: boolean;
}
