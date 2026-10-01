import { Injectable } from '@nestjs/common';
import { In, type EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import {
  currentUser,
  pageWindow,
  paged,
  required,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { Actor } from '@shared/platform/auth/actor';
import type { TableName } from '@shared/database/entities';
import { MediaStatus } from '@shared/domain/values/media.values';
import {
  ReportHistoryActorRole,
  ReportHistoryEventType,
  ReportStatus,
  ReportTargetType,
} from '@shared/domain/values/report.values';
import type {
  ReportHistoryActorRole as ReportHistoryActorRoleType,
  ReportHistoryEventType as ReportHistoryEventTypeType,
  ReportStatus as ReportStatusType,
  ReportTargetType as ReportTargetTypeType,
} from '@shared/domain/values/report.values';
import type { ReportEntity } from '@shared/database/entities/report.entity';
import type { ReportEvidenceEntity } from '@shared/database/entities/report-evidence.entity';
import type { ReportStatusHistoryEntity } from '@shared/database/entities/report-status-history.entity';
import type { BookingDisputeReportPort } from '@modules/booking/ports/booking-dispute-report.port';
import type { CreatedBookingReport } from '@modules/booking/ports/booking-dispute-report.port';
import { Report } from './report.domain';
import { ReportEvidenceMediaPort } from '../ports/report-evidence-media.port';

const TARGET_TABLE: Record<ReportTargetTypeType, TableName> = {
  [ReportTargetType.USER]: 'users',
  [ReportTargetType.BOOKING]: 'bookings',
  [ReportTargetType.PHOTOGRAPHER]: 'photographers',
  [ReportTargetType.PORTFOLIO]: 'portfolios',
  [ReportTargetType.FEEDBACK]: 'feedbacks',
};

type ReportWithEvidenceIds = ReportEntity & { evidence_media_ids: string[] };
type ReportWithPublicHistory = ReportWithEvidenceIds & {
  history: Array<{
    id: string;
    event_type: ReportHistoryEventTypeType;
    from_status: ReportStatusType | null;
    to_status: ReportStatusType;
    actor_role: ReportHistoryActorRoleType;
    created_at: string;
  }>;
};

/** Report intake and case processing for the Moderation report subdomain. */
@Injectable()
export class ModerationReportUseCases implements BookingDisputeReportPort {
  constructor(private readonly evidenceMedia: ReportEvidenceMediaPort) {}

  /** Create a report and persist its evidence and initial history atomically. */
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.ModerationCreateCommandInput,
  ): Promise<ReportWithEvidenceIds> {
    const user = await currentUser(s, a);
    Report.assertValidTargetType(i.target_type);
    await required(s, TARGET_TABLE[i.target_type], i.target_id);

    const mediaIds = i.evidence_media_ids ?? [];
    ensure(mediaIds.length <= 20, 'At most 20 evidence files are allowed');
    ensure(
      new Set(mediaIds).size === mediaIds.length,
      'Duplicate evidence media',
    );

    for (const mediaId of mediaIds) {
      const media = await required(s, 'media', mediaId);
      ensure(
        media.user_id === user.id,
        'Evidence media access denied',
        'forbidden',
      );
      ensure(
        media.status === MediaStatus.READY,
        'Evidence media is not ready',
        'conflict',
      );
    }

    const report = await s.save(EntitySchemas.reports, {
      user_id: user.id,
      target_type: i.target_type,
      target_id: i.target_id,
      reason: i.reason,
    });
    await this.saveEvidence(s, report.id, mediaIds);
    await this.addHistory(s, {
      report_id: report.id,
      event_type: ReportHistoryEventType.CREATED,
      from_status: null,
      to_status: ReportStatus.OPEN,
      actor_user_id: user.id,
      actor_role: ReportHistoryActorRole.USER,
      note: null,
    });

    return { ...report, evidence_media_ids: mediaIds };
  }

  /** Create the report after Booking has authorized the dispute participants. */
  async createBookingDispute(
    s: EntityManager,
    input: { user_id: string; booking_id: string; reason: string },
  ): Promise<CreatedBookingReport> {
    await required(s, 'users', input.user_id);
    await required(s, 'bookings', input.booking_id);
    const report = await s.save(EntitySchemas.reports, {
      user_id: input.user_id,
      target_type: ReportTargetType.BOOKING,
      target_id: input.booking_id,
      reason: input.reason,
    });
    await this.addHistory(s, {
      report_id: report.id,
      event_type: ReportHistoryEventType.CREATED,
      from_status: null,
      to_status: ReportStatus.OPEN,
      actor_user_id: input.user_id,
      actor_role: ReportHistoryActorRole.USER,
      note: null,
    });
    return { ...report, evidence_media_ids: [] };
  }

  /** List the current user's reports with a safe, public status timeline. */
  async mine(s: EntityManager, a: Actor, i: Inputs.ModerationMineQueryInput) {
    const user = await currentUser(s, a);
    const { offset, limit } = pageWindow(i);
    const [reports, total] = await s.findAndCount(EntitySchemas.reports, {
      where: { user_id: user.id },
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    const withEvidence = await this.withEvidenceIds(s, reports);
    const histories = await this.historiesFor(
      s,
      reports.map((report) => report.id),
    );
    const historiesByReport = this.groupByReport(histories);
    const items: ReportWithPublicHistory[] = withEvidence.map((report) => ({
      ...report,
      history: (historiesByReport.get(report.id) ?? []).map((event) => ({
        id: event.id,
        event_type: event.event_type,
        from_status: event.from_status,
        to_status: event.to_status,
        actor_role: event.actor_role,
        created_at: event.created_at,
      })),
    }));
    return paged(items, total, i);
  }

  /** List reports for the admin queue with SQL filtering and pagination. */
  async list(s: EntityManager, a: Actor, i: Inputs.ModerationListQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    const { offset, limit } = pageWindow(i);
    const [reports, total] = await s.findAndCount(EntitySchemas.reports, {
      where: {
        ...(i.status && { status: i.status }),
        ...(i.target_type && { target_type: i.target_type }),
      },
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(await this.withEvidenceIds(s, reports), total, i);
  }

  /** Return a report, evidence media URLs, and its full admin audit history. */
  async get(s: EntityManager, a: Actor, i: Inputs.ModerationGetQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    const report = await required(s, 'reports', i.id);
    const evidenceRows = await s.find(EntitySchemas.report_evidences, {
      where: { report_id: report.id },
      order: { sort_order: 'ASC', created_at: 'ASC', id: 'ASC' },
    });
    const evidenceMedia = await this.evidenceMedia.forModeration(
      s,
      evidenceRows.map((evidence) => evidence.media_id),
    );
    const mediaById = new Map(evidenceMedia.map((media) => [media.id, media]));
    const history = await s.find(EntitySchemas.report_status_history, {
      where: { report_id: report.id },
      order: { created_at: 'ASC', id: 'ASC' },
    });

    return {
      ...report,
      evidence_media_ids: evidenceRows.map((evidence) => evidence.media_id),
      evidence: evidenceRows.map((evidence) => {
        const media = mediaById.get(evidence.media_id);
        ensure(media, 'Report evidence media not found', 'missing');
        return {
          report_evidence_id: evidence.id,
          sort_order: evidence.sort_order,
          ...media,
        };
      }),
      history,
    };
  }

  /** Resolve or escalate an open case, appending its audit event atomically. */
  async resolve(
    s: EntityManager,
    a: Actor,
    i: Inputs.ModerationResolveCommandInput,
  ): Promise<ReportWithEvidenceIds> {
    role(a, 'admin');
    const user = await currentUser(s, a);
    const report = await s.findOne(EntitySchemas.reports, {
      where: { id: i.id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(report, 'reports not found', 'missing');
    Report.assertCanTransition(report.status, i.status);

    const final = Report.isFinalStatus(i.status);
    const updated = await updateEntity(s, EntitySchemas.reports, report.id, {
      status: i.status,
      resolution: final ? i.resolution : null,
      resolved_by: final ? user.id : null,
    });
    await this.addHistory(s, {
      report_id: report.id,
      event_type: ReportHistoryEventType.STATUS_CHANGED,
      from_status: report.status,
      to_status: i.status,
      actor_user_id: user.id,
      actor_role: ReportHistoryActorRole.ADMIN,
      note: i.resolution,
    });
    const [result] = await this.withEvidenceIds(s, [updated]);
    ensure(result, 'reports not found', 'missing');
    return result;
  }

  private async saveEvidence(
    s: EntityManager,
    reportId: string,
    mediaIds: readonly string[],
  ) {
    if (!mediaIds.length) return;
    await s.save(
      EntitySchemas.report_evidences,
      mediaIds.map((media_id, sort_order) => ({
        report_id: reportId,
        media_id,
        sort_order,
      })),
    );
  }

  private async withEvidenceIds(
    s: EntityManager,
    reports: ReportEntity[],
  ): Promise<ReportWithEvidenceIds[]> {
    if (!reports.length) return [];
    const evidence = await s.find(EntitySchemas.report_evidences, {
      where: { report_id: In(reports.map((report) => report.id)) },
      order: { sort_order: 'ASC', created_at: 'ASC', id: 'ASC' },
    });
    const evidenceByReport = new Map<string, ReportEvidenceEntity[]>();
    for (const row of evidence) {
      const rows = evidenceByReport.get(row.report_id) ?? [];
      rows.push(row);
      evidenceByReport.set(row.report_id, rows);
    }
    return reports.map((report) => ({
      ...report,
      evidence_media_ids: (evidenceByReport.get(report.id) ?? []).map(
        (row) => row.media_id,
      ),
    }));
  }

  private async historiesFor(s: EntityManager, reportIds: string[]) {
    if (!reportIds.length) return [];
    return s.find(EntitySchemas.report_status_history, {
      where: { report_id: In(reportIds) },
      order: { created_at: 'ASC', id: 'ASC' },
    });
  }

  private groupByReport(histories: ReportStatusHistoryEntity[]) {
    const grouped = new Map<string, ReportStatusHistoryEntity[]>();
    for (const event of histories) {
      const events = grouped.get(event.report_id) ?? [];
      events.push(event);
      grouped.set(event.report_id, events);
    }
    return grouped;
  }

  private addHistory(
    s: EntityManager,
    event: {
      report_id: string;
      event_type: ReportHistoryEventTypeType;
      from_status: ReportStatusType | null;
      to_status: ReportStatusType;
      actor_user_id: string | null;
      actor_role: ReportHistoryActorRoleType;
      note: string | null;
    },
  ) {
    return s.save(EntitySchemas.report_status_history, event);
  }
}
