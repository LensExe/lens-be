import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Trạng thái lời mời thợ liên kết.
 */
export const BookingCollaboratorStatus = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REVOKED: 'revoked',
} as const;

export type BookingCollaboratorStatus =
  (typeof BookingCollaboratorStatus)[keyof typeof BookingCollaboratorStatus];

/**
 * Entity đại diện cho bảng `booking_collaborators`.
 * Thợ chính mời thợ khác chụp cùng booking và chia % phần thợ nhận (D5, D17).
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
  status!: BookingCollaboratorStatus;

  /** Lúc thợ được mời nhận hoặc từ chối; `null` khi chưa trả lời hoặc bị rút */
  @Column('timestamptz', { nullable: true, transformer: timestampTransformer })
  responded_at!: string | null;
}
