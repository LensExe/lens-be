import { ensure } from '@shared/domain/domain.error';
import {
  REPORT_TARGET_TYPES,
  ReportTargetType,
  RESOLVABLE_REPORT_STATUSES,
  ReportStatus,
} from '@shared/domain/values/report.values';

export {
  REPORT_TARGET_TYPES,
  ReportTargetType,
  RESOLVABLE_REPORT_STATUSES,
  ReportStatus,
};

/**
 * Domain rules for content moderation (user reports).
 */
export class Report {
  static readonly TARGET_TYPES = REPORT_TARGET_TYPES;
  static readonly RESOLVABLE_STATUSES = RESOLVABLE_REPORT_STATUSES;

  /**
   * Check whether the reported target type is supported.
   *
   * @param targetType Target type.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertValidTargetType(targetType: string) {
    ensure(
      (Report.TARGET_TYPES as readonly string[]).includes(targetType),
      'Invalid report target',
    );
  }

  /**
   * A report can only be resolved once. After resolution it is immutable.
   *
   * @param status Current status or target status.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertResolvable(status: string) {
    ensure(
      (Report.RESOLVABLE_STATUSES as readonly string[]).includes(status),
      'Report already resolved',
      'conflict',
    );
  }
}
