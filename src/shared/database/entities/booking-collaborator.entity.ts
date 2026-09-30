import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';
import { BookingCollaboratorStatus } from '@shared/domain/values/booking.values';

/**
 * Entity lưu dữ liệu collaboration cũ/tạm giữ để có thể bật lại sau này.
 * Tính năng hiện bị vô hiệu hoá; booking runtime chỉ dùng `bookings.photographer_id`.
 */
@Entity('booking_collaborators')
export class BookingCollaboratorEntity extends BaseEntity {
  /** ID booking (khóa ngoại `bookings.id`) */
  @Column('uuid')
  booking_id!: string;

  /** ID hồ sơ thợ được mời (khóa ngoại `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** % phần thợ nhận chia cho thợ này, số nguyên 1–100 */
  @Column('smallint')
  share_percent!: number;

  /** Trạng thái lời mời ('invited' | 'accepted' | 'declined' | 'revoked') */
  @Column('text', { default: BookingCollaboratorStatus.INVITED })
  status!: import('@shared/domain/values/booking.values').BookingCollaboratorStatus;

  /** Lúc thợ được mời nhận hoặc từ chối; `null` khi chưa trả lời hoặc bị rút */
  @Column('timestamptz', { nullable: true, transformer: timestampTransformer })
  responded_at!: string | null;
}
