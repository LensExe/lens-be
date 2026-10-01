import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  ReportStatus,
  type ReportStatus as ReportStatusType,
  type ReportTargetType,
} from '@shared/domain/values/report.values';

/**
 * Entity representing the `reports` table.
 * Central intake and processing for disputes and violation reports.
 */
@Entity('reports')
export class ReportEntity extends BaseEntity {
  /** ID of the user who submitted the report or dispute (foreign key referencing `users.id`). */
  @Column('uuid')
  user_id!: string;

  /**
   * Type of reported or disputed target.
   * ('booking' | 'user' | 'photographer' | 'portfolio' | 'feedback')
   */
  @Column()
  target_type!: ReportTargetType;

  /** ID of the specific reported or disputed target (for example, `booking_id` or `photographer_id`). */
  @Column('uuid')
  target_id!: string;

  /** Detailed report or dispute reason and description. */
  @Column('text')
  reason!: string;

  /** Report processing status ('open' | 'resolved' | 'rejected' | 'escalated'). */
  @Column({ default: ReportStatus.OPEN })
  status!: ReportStatusType;

  /** Resolution or action taken by the administration. */
  @Column('text', { nullable: true })
  resolution!: string | null;

  /** ID of the admin who resolved this report (foreign key `users.id`). */
  @Column('uuid', { nullable: true })
  resolved_by!: string | null;
}
