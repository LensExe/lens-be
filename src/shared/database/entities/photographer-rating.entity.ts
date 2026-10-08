import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity representing the `photographer_ratings` table.
 * Aggregates a photographer's ratings, reputation, and work performance metrics.
 */
@Entity('photographer_ratings')
export class PhotographerRatingEntity extends BaseEntity {
  /** Photographer ID (unique foreign key referencing `photographers.id`). */
  @Column('uuid', { unique: true })
  photographer_id!: string;

  /** Average rating (from 1.0 to 5.0). */
  @Column('numeric', {
    default: 0,
    transformer: bigintColumn.transformer,
  })
  average_rating!: number;

  /** Total number of customer reviews received. */
  @Column({ default: 0 })
  total_feedbacks!: number;

  /** Total number of completed bookings. */
  @Column({ default: 0 })
  total_bookings!: number;

  /** Number of returning customers who have booked multiple times (customer retention). */
  @Column({ default: 0 })
  return_customers!: number;
}
