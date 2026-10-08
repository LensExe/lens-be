import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity representing the `photographer_badges` table.
 * Badges earned by photographers; permanent, with one row per badge code for each photographer.
 */
@Entity('photographer_badges')
export class PhotographerBadgeEntity extends BaseEntity {
  /** ID of the photographer profile that earned the badge (foreign key `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Badge code (foreign key `badges.code`). */
  @Column('text')
  code!: string;

  /** Time when the photographer earned the badge. */
  @Column('timestamptz', { transformer: timestampTransformer })
  earned_at!: string;
}
