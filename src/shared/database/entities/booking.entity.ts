import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  bigintColumn,
  timestampTransformer,
} from './utils/column-transformers';
import { BookingStatus } from '@shared/domain/values/booking.values';

/**
 * Entity representing the `bookings` table.
 * Core business table managing photography bookings between customers and photographers.
 */
@Entity('bookings')
export class BookingEntity extends BaseEntity {
  /** ID of the customer who made the booking (foreign key referencing `customers.id`). */
  @Column('uuid')
  customer_id!: string;

  /** Photographer solely responsible for the booking (foreign key `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** ID of the selected photography plan (foreign key referencing `booking_plans.id`). */
  @Column('uuid')
  booking_plan_id!: string;

  /** Location of the photo shoot. */
  @Column()
  location!: string;

  /** Shoot start time (ISO timestamptz string). */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  from!: string;

  /** Expected shoot end time (ISO timestamptz string). */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  to!: string;

  /** Deposit amount due in advance (VND). */
  @Column(bigintColumn)
  deposit_amount!: number;

  /** Total contract value for the booking (VND). */
  @Column(bigintColumn)
  total_amount!: number;

  /** Booking status ('pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'in_progress' | 'shot' | 'completed'). */
  @Column({ default: BookingStatus.PENDING })
  status!: import('@shared/domain/values/booking.values').BookingStatus;

  /** When the photographer accepted the booking; the deposit payment deadline is calculated from this time. `null` if not accepted. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  accepted_at!: string | null;

  /** Time when the delivered photo album was published for the customer. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  gallery_published_at!: string | null;
}
