import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `working_hours` table.
 * A photographer's weekly working shift; `HH:MM` times are in Vietnam time.
 */
@Entity('working_hours')
export class WorkingHourEntity extends BaseEntity {
  /** Photographer profile ID (foreign key `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Day of the week: 1 (Monday) through 7 (Sunday). */
  @Column('smallint')
  weekday!: number;

  /** Shift start time in `HH:MM` format. */
  @Column('text')
  start_time!: string;

  /** Shift end time in `HH:MM` format (after the start time). */
  @Column('text')
  end_time!: string;
}
