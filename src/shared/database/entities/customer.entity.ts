import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

/**
 * Entity đại diện cho bảng `customers`.
 * Lưu trữ thông tin hồ sơ bổ sung dành riêng cho người dùng đóng vai trò Khách hàng (người thuê chụp ảnh).
 */
@Entity('customers')
export class CustomerEntity extends BaseEntity {
  /** ID của người dùng (khóa ngoại duy nhất liên kết tới `users.id`) */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Giới thiệu ngắn về khách hàng hoặc nhu cầu chụp ảnh */
  @Column('text', { nullable: true })
  description!: string | null;

  /** Danh sách các phong cách chụp ảnh yêu thích để gợi ý thợ ảnh phù hợp */
  @Column('jsonb', {
    default: () => "'[]'::jsonb",
  })
  preferred_styles!: PhotographyStyle[];

  /** Vị trí / khu vực hoạt động hoặc nơi cư trú của khách hàng */
  @Column('text', { nullable: true })
  location!: string | null;
}
