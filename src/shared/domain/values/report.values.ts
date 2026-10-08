/** Types of targets that can be reported or disputed. */
export const ReportTargetType = {
  USER: 'user',
  BOOKING: 'booking',
  PHOTOGRAPHER: 'photographer',
  PORTFOLIO: 'portfolio',
  FEEDBACK: 'feedback',
} as const;

export type ReportTargetType =
  (typeof ReportTargetType)[keyof typeof ReportTargetType];

export const REPORT_TARGET_TYPES = [
  ReportTargetType.USER,
  ReportTargetType.BOOKING,
  ReportTargetType.PHOTOGRAPHER,
  ReportTargetType.PORTFOLIO,
  ReportTargetType.FEEDBACK,
] as const;

/** Processing status of a report or dispute. */
export const ReportStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

/** Statuses an administrator may set when processing a report. */
export const REPORT_RESOLUTION_STATUSES = [
  ReportStatus.RESOLVED,
  ReportStatus.REJECTED,
  ReportStatus.ESCALATED,
] as const;

export type ReportResolutionStatus =
  (typeof REPORT_RESOLUTION_STATUSES)[number];

export const RESOLVABLE_REPORT_STATUSES = [
  ReportStatus.OPEN,
  ReportStatus.ESCALATED,
] as const;

export type ResolvableReportStatus =
  (typeof RESOLVABLE_REPORT_STATUSES)[number];

/** Events recorded in the append-only report status history. */
export const ReportHistoryEventType = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  IMPORTED: 'imported',
} as const;

export type ReportHistoryEventType =
  (typeof ReportHistoryEventType)[keyof typeof ReportHistoryEventType];

/** Actor categories stored with report history events. */
export const ReportHistoryActorRole = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type ReportHistoryActorRole =
  (typeof ReportHistoryActorRole)[keyof typeof ReportHistoryActorRole];
