import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `ranks` table.
 * Photographer rank catalog with minimum completed-session thresholds and platform commission percentages; editable by admins.
 */
@Entity('ranks')
export class RankEntity extends BaseEntity {
  /** Rank code (for example, 'newbie' or 'gold'). */
  @Column('text', { unique: true })
  code!: string;

  /** Display name (for example, 'Gold'). */
  @Column('text')
  name!: string;

  /** Minimum number of completed shoots required to attain the rank. */
  @Column('integer', { unique: true })
  min_completed!: number;

  /** Platform commission percentage for this rank (0–100). */
  @Column('numeric', {
    precision: 5,
    scale: 2,
    transformer: { to: (v: unknown) => v, from: (v: string) => Number(v) },
  })
  commission_percent!: number;
}
