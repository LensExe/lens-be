import type {
  ReportResolutionStatus,
  ReportStatus,
  ReportTargetType,
} from '@shared/domain/values/report.values';

export type ModerationDashboardQueryInput = Record<string, never>;

export interface ModerationListQueryInput {
  limit?: number;
  offset?: number;
  status?: ReportStatus;
  target_type?: ReportTargetType;
}

export interface ModerationMineQueryInput {
  limit?: number;
  offset?: number;
}

export interface ModerationCreateCommandInput {
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  evidence_media_ids?: string[];
}

export interface ModerationResolveCommandInput {
  id: string;
  status: ReportResolutionStatus;
  resolution: string;
}

export interface ModerationGetQueryInput {
  id: string;
}
