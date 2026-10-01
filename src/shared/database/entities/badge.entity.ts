import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { BadgeMetric } from '@shared/domain/values/badge.values';

/**
 * Entity representing the `badges` table.
 * Badge catalog with names, descriptions, evaluation metrics, and thresholds; editable by admins.
 */
@Entity('badges')
export class BadgeEntity extends BaseEntity {
  /** Badge code (for example, 'top-rated'). */
  @Column('text', { unique: true })
  code!: string;

  /** Display name (for example, 'Top Rated'). */
  @Column('text')
  name!: string;

  /** User-facing description of the requirements. */
  @Column('text', { default: '' })
  description!: string;

  /** Metric used for evaluation. */
  @Column('text')
  metric!: BadgeMetric;

  /** Minimum metric value required to earn the badge. */
  @Column('numeric', {
    transformer: { to: (v: unknown) => v, from: (v: string) => Number(v) },
  })
  min_value!: number;

  /** Minimum number of visible reviews (0 means no minimum is required). */
  @Column('integer', { default: 0 })
  min_reviews!: number;

  /** When disabled, no new awards are made (previously awarded badges remain). */
  @Column({ default: true })
  is_active!: boolean;
}
