import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Cấu hình tính năng / đặc quyền của gói hội viên
 */
export interface PlanFeature {
  /**
   * Mã định danh tính năng (ví dụ: 'MAX_IMAGES', 'BADGE_PRO', 'PRIORITY_SEARCH')
   */
  code: string;

  /**
   * Tên hiển thị tính năng (ví dụ: 'Tải tối đa 100 ảnh', 'Huy hiệu PRO nổi bật')
   */
  name: string;

  /**
   * Giá trị cấu hình của tính năng (ví dụ: '100', 'true', 'unlimited')
   */
  value: string;
}

/**
 * Entity đại diện cho bảng `photographer_plans`.
 * Định nghĩa các gói hội viên / thuê bao dành cho Nhiếp ảnh gia (ví dụ: gói PRO, VIP theo tháng/năm).
 */
@Entity('photographer_plans')
export class PhotographerPlanEntity extends BaseEntity {
  /** Mã định danh gói hội viên (duy nhất, ví dụ: 'MONTHLY_PRO', 'YEARLY_VIP') */
  @Column({ unique: true })
  code!: string;

  /** Tên gói hội viên */
  @Column()
  name!: string;

  /** Mô tả chi tiết quyền lợi gói hội viên */
  @Column('text', { nullable: true })
  description!: string | null;

  /** Giá cước thuê bao gói (VND) */
  @Column(bigintColumn)
  price!: number;

  /** Trạng thái gói còn mở bán hay không */
  @Column({ default: true })
  is_active!: boolean;

  /** Chu kỳ thanh toán (tính bằng số ngày, ví dụ: 30 ngày, 365 ngày) */
  @Column()
  billing_cycle!: number;

  /**
   * Danh sách tính năng / đặc quyền của gói hội viên (lưu trực tiếp dưới dạng mảng JSONB).
   */
  @Column('jsonb', { default: [] })
  features!: PlanFeature[];
}
