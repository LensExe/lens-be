import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity managing photographers' personal blocked or busy time slots.
 * Photographers are available by default except for intervals in this table and bookings reserving their time.
 */
@Entity('offline_slots') // or 'busy_slots'.
export class OfflineSlotEntity extends BaseEntity {
  /** Photographer ID (foreign key referencing `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Start of the busy interval (ISO timestamptz string, inclusive). */
  @Column('timestamptz', { transformer: timestampTransformer })
  from!: string;

  /** End of the busy interval (ISO timestamptz string, exclusive). */
  @Column('timestamptz', { transformer: timestampTransformer })
  to!: string;

  /** Optional reason for being busy (for example, 'Family commitment' or 'External booking'). */
  @Column('text', { nullable: true })
  reason!: string | null;
}
