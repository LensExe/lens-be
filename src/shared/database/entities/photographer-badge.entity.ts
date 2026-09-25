import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `photographer_badges`.
 * Huy hiệu thợ đã đạt; giữ vĩnh viễn, mỗi thợ mỗi mã huy hiệu một dòng (D13).
 */
@Entity('photographer_badges')
export class PhotographerBadgeEntity extends BaseEntity {
  /** ID hồ sơ thợ đạt huy hiệu (khóa ngoại `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Mã huy hiệu: 'top-rated' | 'punctual' | 'loyal' */
  @Column('text')
  code!: string;

  /** Thời điểm thợ đạt huy hiệu */
  @Column('timestamptz', { transformer: timestampTransformer })
  earned_at!: string;
}
