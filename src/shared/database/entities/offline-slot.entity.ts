import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity quản lý các khung giờ bận cá nhân của Nhiếp ảnh gia (Block / Busy Time).
 * Thợ rảnh trong giờ làm (`working_hours`), trừ các khoảng chặn trong bảng này và các đơn booking đã nhận.
 */
@Entity('offline_slots') // hoặc 'busy_slots'
export class OfflineSlotEntity extends BaseEntity {
  /** ID của thợ ảnh (khóa ngoại liên kết `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Bắt đầu khoảng bận (ISO timestamptz string, tính cả điểm này) */
  @Column('timestamptz', { transformer: timestampTransformer })
  from!: string;

  /** Kết thúc khoảng bận (ISO timestamptz string, không tính điểm này) */
  @Column('timestamptz', { transformer: timestampTransformer })
  to!: string;

  /** Lý do bận (tùy chọn, ví dụ: 'Bận việc gia đình', 'Kèo chụp ngoài sàn') */
  @Column('text', { nullable: true })
  reason!: string | null;
}
