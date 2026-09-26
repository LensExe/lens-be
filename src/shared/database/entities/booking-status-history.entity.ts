import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { BookingStatus } from './booking.entity';

/**
 * Bên thực hiện một lần đổi trạng thái booking.
 */
export const BookingActorRole = {
  CUSTOMER: 'customer',
  PHOTOGRAPHER: 'photographer',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type BookingActorRole =
  (typeof BookingActorRole)[keyof typeof BookingActorRole];

/**
 * Entity đại diện cho bảng `booking_status_history`.
 * Mỗi lần tạo hoặc chuyển trạng thái booking ghi 1 dòng; dùng cho timeline.
 */
@Entity('booking_status_history')
export class BookingStatusHistoryEntity extends BaseEntity {
  /** ID booking (khóa ngoại `bookings.id`) */
  @Column('uuid')
  booking_id!: string;

  /** Trạng thái trước khi đổi; `null` ở dòng tạo booking */
  @Column('text', { nullable: true })
  from_status!: BookingStatus | null;

  /** Trạng thái sau khi đổi */
  @Column('text')
  to_status!: BookingStatus;

  /** Bên thực hiện ('customer' | 'photographer' | 'admin' | 'system') */
  @Column('text')
  actor_role!: BookingActorRole;

  /** User thực hiện (khóa ngoại `users.id`); chỉ được `null` khi `actor_role = 'system'` (job nền) */
  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  /** Lý do (bắt buộc với reject / cancel) */
  @Column('text', { nullable: true })
  reason!: string | null;
}
