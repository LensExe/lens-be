import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import type {
  ReportHistoryActorRole,
  ReportHistoryEventType,
  ReportStatus,
} from '@shared/domain/values/report.values';

/** Append-only record of report creation and moderation status changes. */
@Entity('report_status_history')
@Index(['report_id', 'created_at', 'id'])
export class ReportStatusHistoryEntity extends BaseEntity {
  @Column('uuid')
  report_id!: string;

  @Column('text')
  event_type!: ReportHistoryEventType;

  @Column('text', { nullable: true })
  from_status!: ReportStatus | null;

  @Column('text')
  to_status!: ReportStatus;

  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  @Column('text')
  actor_role!: ReportHistoryActorRole;

  @Column('text', { nullable: true })
  note!: string | null;
}
