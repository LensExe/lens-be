import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import type {
  BookingActorRole,
  BookingStatus,
} from '@shared/domain/values/booking.values';

/**
 * Entity representing the `booking_status_history` table.
 * Each booking creation or status change adds a row for the timeline.
 */
@Entity('booking_status_history')
export class BookingStatusHistoryEntity extends BaseEntity {
  /** Booking ID (foreign key `bookings.id`). */
  @Column('uuid')
  booking_id!: string;

  /** Previous status; `null` when the booking is created. */
  @Column('text', { nullable: true })
  from_status!: BookingStatus | null;

  /** Status after the change. */
  @Column('text')
  to_status!: BookingStatus;

  /** Actor type ('customer' | 'photographer' | 'admin' | 'system'). */
  @Column('text')
  actor_role!: BookingActorRole;

  /** Acting user (foreign key `users.id`); may be `null` only when `actor_role = 'system'` (background job). */
  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  /** Reason (required for rejection or cancellation). */
  @Column('text', { nullable: true })
  reason!: string | null;
}
