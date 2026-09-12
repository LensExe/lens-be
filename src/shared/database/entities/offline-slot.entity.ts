import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity quản lý các khung giờ bận cá nhân của Nhiếp ảnh gia (Block / Busy Time).
 * Mặc định thợ ảnh luôn rảnh, trừ các khoảng thời gian được đánh dấu trong bảng này và các đơn booking đã nhận.
 */
@Entity('offline_slots') // hoặc 'busy_slots'
export class OfflineSlotEntity extends BaseEntity {
  /** ID của thợ ảnh (khóa ngoại liên kết `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Ngày thợ ảnh nghỉ / bận (định dạng 'YYYY-MM-DD') */
  @Column('date')
  date!: string;

  /** Lý do bận (tùy chọn, ví dụ: 'Bận việc gia đình', 'Kèo chụp ngoài sàn') */
  @Column('text', { nullable: true })
  reason!: string | null;
}
