import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity representing the `booking_plans` table.
 * Manages photography service plans and prices listed by photographers.
 */
@Entity('booking_plans')
export class BookingPlanEntity extends BaseEntity {
  /** ID of the photographer who owns and offers this plan (foreign key `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Plan name (for example, 'Personal Yearbook Photos', 'Wedding Photojournalism', or 'Outdoor Portraits'). */
  @Column()
  name!: string;

  /** Detailed description of the photography plan. */
  @Column('text', { nullable: true })
  description!: string | null;

  /** Listed price set by the photographer (VND). */
  @Column(bigintColumn)
  price!: number;

  /** Expected shoot duration in minutes (for example, 60 or 120 minutes). */
  @Column({ default: 60 })
  duration_minutes!: number;

  /** Number of images the photographer commits to deliver. */
  @Column({ default: 20 })
  photo_count!: number;

  /** Number of images included with detailed editing/retouching. */
  @Column({ default: 5 })
  retouched_photo_count!: number;

  /**
   * List of additional benefits or notes included with the plan (string array).
   * For example: ["One outfit included", "Light makeup included", "Photos delivered in 3 days"].
   */
  @Column('jsonb', { default: [] })
  features!: string[];

  /** Whether the plan is accepting customers or temporarily unavailable. */
  @Column({ default: true })
  is_active!: boolean;
}
