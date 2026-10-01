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

export const RESOLVABLE_REPORT_STATUSES = [
  ReportStatus.OPEN,
  ReportStatus.ESCALATED,
] as const;

export type ResolvableReportStatus =
  (typeof RESOLVABLE_REPORT_STATUSES)[number];
