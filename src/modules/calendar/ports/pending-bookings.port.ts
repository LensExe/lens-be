import type { EntityManager } from 'typeorm';
import type { WorkingShift } from '@shared/domain/types/work-schedule.types';

/** Photographer pending booking requests, used by Calendar to preview and reject requests when blocking time or changing working hours. */
export interface PendingRequest {
  id: string;
  customer_id: string;
  from: string;
  to: string;
}

/** Query and reject pending booking requests in the caller’s transaction. */
export abstract class PendingBookingsPort {
  /**
   * Photographer pending requests that overlap a time range.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @param range Time range about to be blocked.
   * @returns Affected requests, ordered by start time.
   */
  abstract pendingOverlapping(
    manager: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ): Promise<PendingRequest[]>;

  /**
   * Photographer pending requests that no longer fit entirely within a shift in the new weekly schedule.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @param schedule New weekly schedule; an empty schedule uses the default hours.
   * @returns Affected requests, ordered by start time.
   */
  abstract pendingOutside(
    manager: EntityManager,
    photographerId: string,
    schedule: readonly WorkingShift[],
  ): Promise<PendingRequest[]>;

  /**
   * Reject all remaining `pending` requests as a system action, with a reason, history entry, and real-time notification.
   * Skip a request if its status changed in the meantime.
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param bookingIds IDs of requests to reject.
   * @param reason Reason to record in the history.
   * @returns Number of requests rejected.
   */
  abstract decline(
    manager: EntityManager,
    bookingIds: readonly string[],
    reason: string,
  ): Promise<number>;
}
