import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `customers`.
 * Lưu trữ thông tin hồ sơ bổ sung dành riêng cho người dùng đóng vai trò Khách hàng (người thuê chụp ảnh).
 */
@Entity('customers')
export class CustomerEntity extends BaseEntity {
  /** ID của người dùng (khóa ngoại duy nhất liên kết tới `users.id`) */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Danh sách các phong cách chụp ảnh yêu thích để gợi ý thợ ảnh phù hợp */
  @Column('jsonb', { default: [] })
  preferred_styles!: string[];

  /** Vị trí / khu vực hoạt động hoặc nơi cư trú của khách hàng */
  @Column('text', { nullable: true })
  location!: string | null;
}
