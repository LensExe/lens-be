import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `working_hours`.
 * Một ca làm trong tuần của thợ; giờ `HH:MM` theo giờ Việt Nam.
 */
@Entity('working_hours')
export class WorkingHourEntity extends BaseEntity {
  /** ID hồ sơ thợ (khóa ngoại `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Thứ trong tuần: 1 (thứ Hai) … 7 (Chủ nhật) */
  @Column('smallint')
  weekday!: number;

  /** Giờ bắt đầu ca `HH:MM` */
  @Column('text')
  start_time!: string;

  /** Giờ kết thúc ca `HH:MM` (sau giờ bắt đầu) */
  @Column('text')
  end_time!: string;
}
