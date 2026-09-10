import { ensure } from '@shared/platform/exceptions/domain.error';

/**
 * Domain rules for content moderation (user reports).
 */
export class Report {
  static readonly TARGET_TYPES = [
    'user',
    'review',
    'booking',
    'media',
  ] as const;
  static readonly RESOLVABLE_STATUSES = ['open', 'escalated'] as const;

  static assertValidTargetType(targetType: string) {
    ensure(
      (Report.TARGET_TYPES as readonly string[]).includes(targetType),
      'Invalid report target',
    );
  }

  /**
   * A report can only be resolved once. After resolution it is immutable.
   */
  static assertResolvable(status: string) {
    ensure(
      (Report.RESOLVABLE_STATUSES as readonly string[]).includes(status),
      'Report already resolved',
      'conflict',
    );
  }
}
