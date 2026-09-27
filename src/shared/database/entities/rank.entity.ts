import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `ranks`.
 * Danh mục hạng thợ: mốc số buổi hoàn tất tối thiểu và % commission sàn thu; admin chỉnh được.
 */
@Entity('ranks')
export class RankEntity extends BaseEntity {
  /** Mã hạng (ví dụ: 'newbie', 'gold') */
  @Column('text', { unique: true })
  code!: string;

  /** Tên hiển thị (ví dụ: 'Vàng') */
  @Column('text')
  name!: string;

  /** Số buổi chụp hoàn tất tối thiểu để đạt hạng */
  @Column('integer', { unique: true })
  min_completed!: number;

  /** % commission sàn thu ở hạng này (0–100) */
  @Column('numeric', {
    precision: 5,
    scale: 2,
    transformer: { to: (v: unknown) => v, from: (v: string) => Number(v) },
  })
  commission_percent!: number;
}
