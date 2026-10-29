import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** A media file attached as evidence to a report. */
@Entity('report_evidences')
@Index(['report_id', 'media_id'], { unique: true })
@Index(['report_id', 'sort_order'])
export class ReportEvidenceEntity extends BaseEntity {
  @Column('uuid')
  report_id!: string;

  @Column('uuid')
  media_id!: string;

  @Column('integer', { default: 0 })
  sort_order!: number;
}
