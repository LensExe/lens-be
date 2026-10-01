import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';
import { BookingCollaboratorStatus } from '@shared/domain/values/booking.values';

/**
 * Entity storing legacy or retained collaboration data so the feature can be re-enabled later.
 * The feature is currently disabled; booking runtime uses only `bookings.photographer_id`.
 */
@Entity('booking_collaborators')
export class BookingCollaboratorEntity extends BaseEntity {
  /** Booking ID (foreign key `bookings.id`). */
  @Column('uuid')
  booking_id!: string;

  /** ID of the invited photographer profile (foreign key `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Percentage share allocated to this photographer, an integer from 1 to 100. */
  @Column('smallint')
  share_percent!: number;

  /** Invitation status ('invited' | 'accepted' | 'declined' | 'revoked'). */
  @Column('text', { default: BookingCollaboratorStatus.INVITED })
  status!: import('@shared/domain/values/booking.values').BookingCollaboratorStatus;

  /** When the photographer accepted or declined; `null` if unanswered or revoked. */
  @Column('timestamptz', { nullable: true, transformer: timestampTransformer })
  responded_at!: string | null;
}
