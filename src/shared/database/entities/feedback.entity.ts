import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';
import { ReviewStatus } from '@shared/domain/values/review.values';

/**
 * Entity representing the `feedbacks` table.
 * Stores customer reviews and the photographer's official response after a shoot.
 */
@Entity('feedbacks')
export class FeedbackEntity extends BaseEntity {
  /** ID of the reviewed booking (unique foreign key referencing `bookings.id`). */
  @Column('uuid', { unique: true })
  booking_id!: string;

  /** ID of the customer who submitted the review (foreign key referencing `customers.id`). */
  @Column('uuid')
  customer_id!: string;

  /** ID of the reviewed photographer profile (foreign key `photographers.id`), used to filter reviews by photographer. */
  @Column('uuid')
  photographer_id!: string;

  /** Overall quality rating (1 to 5 stars). */
  @Column()
  rating!: number;

  /** Photographer punctuality rating (1 to 5 stars). */
  @Column()
  punctuality_rating!: number;

  /** Rating for service and communication (1 to 5 stars). */
  @Column()
  attitude_rating!: number;

  /** Customer's written review. */
  @Column({ default: '' })
  comment!: string;

  /** Whether the customer has edited the review before. */
  @Column({ default: false })
  is_edited!: boolean;

  /** Visibility status ('visible' | 'deleted_by_author' | 'hidden_by_admin'); see `ReviewStatus`. */
  @Column({ default: ReviewStatus.VISIBLE })
  status!: import('@shared/domain/values/review.values').ReviewStatus;

  /** Reason an admin hid the review; `null` if it is not hidden by an admin or was hidden before reasons were recorded. */
  @Column('text', { nullable: true })
  hidden_reason!: string | null;

  // --- PHOTOGRAPHER REPLY (MERGED FROM REPLIES) ---

  /** Photographer's response (`null` means there is no response yet). */
  @Column('text', { nullable: true })
  photographer_reply!: string | null;

  /** Time when the photographer submitted the response. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  replied_at!: string | null;
}
