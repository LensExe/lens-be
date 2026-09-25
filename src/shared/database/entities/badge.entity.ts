import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/** Chỉ số dùng để xét huy hiệu; cách tính từng chỉ số nằm trong code. */
export const BadgeMetric = {
  AVERAGE_RATING: 'average_rating',
  AVERAGE_PUNCTUALITY: 'average_punctuality',
  RETURN_CUSTOMERS: 'return_customers',
} as const;

export type BadgeMetric = (typeof BadgeMetric)[keyof typeof BadgeMetric];

/**
 * Entity đại diện cho bảng `badges`.
 * Danh mục huy hiệu: tên, mô tả, chỉ số xét và ngưỡng; admin chỉnh được.
 */
@Entity('badges')
export class BadgeEntity extends BaseEntity {
  /** Mã huy hiệu (ví dụ: 'top-rated') */
  @Column('text', { unique: true })
  code!: string;

  /** Tên hiển thị (ví dụ: 'Đánh giá xuất sắc') */
  @Column('text')
  name!: string;

  /** Mô tả điều kiện cho người dùng đọc */
  @Column('text', { default: '' })
  description!: string;

  /** Chỉ số dùng để xét */
  @Column('text')
  metric!: BadgeMetric;

  /** Giá trị tối thiểu của chỉ số để đạt huy hiệu */
  @Column('numeric', {
    transformer: { to: (v: unknown) => v, from: (v: string) => Number(v) },
  })
  min_value!: number;

  /** Số review đang hiện tối thiểu (0 = không yêu cầu) */
  @Column('integer', { default: 0 })
  min_reviews!: number;

  /** Tắt thì không cấp mới (huy hiệu đã cấp vẫn giữ) */
  @Column({ default: true })
  is_active!: boolean;
}
