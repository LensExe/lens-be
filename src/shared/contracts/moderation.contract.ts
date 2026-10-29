import type {
  ReportResolutionStatus,
  ReportStatus,
  ReportTargetType,
} from '@shared/domain/values/report.values';

export type ModerationDashboardQueryInput = Record<string, never>;

export interface AdminDashboardAnalyticsQueryInput {
  months?: number;
}

export interface AdminDashboardAnalyticsData {
  monthly: Array<{
    month: string;
    bookings: number;
    paid_volume_vnd: number;
  }>;
  booking_by_style: Array<{ style: string; bookings: number }>;
  booking_by_location: Array<{ location: string; bookings: number }>;
  recent_activity: Array<{
    id: string;
    kind: 'booking' | 'report';
    title: string;
    detail: string;
    status: string;
    created_at: string;
  }>;
}

export interface AdminStorageQueryInput {
  limit?: number;
  offset?: number;
  over_quota?: boolean;
}

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
  report_id: string;
  status: ReportResolutionStatus;
  resolution: string;
}

export interface ModerationGetQueryInput {
  report_id: string;
}
