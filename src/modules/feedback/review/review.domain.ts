import { ensure } from '@shared/domain/domain.error';
import { ReviewStatus } from '@shared/domain/values/review.values';
import { BookingStatus } from '@shared/domain/values/booking.values';

/** Number of days after submission during which the customer may edit a review. */
export const REVIEW_EDIT_WINDOW_DAYS = 7;

/** Review visibility changes: the customer deletes their own review, or an admin hides or restores it. */
export type ReviewVisibilityAction = 'delete' | 'hide' | 'restore';

/**
 * Review rules: only completed bookings can be reviewed; reviews can be edited within 7 days; who may hide or restore them;
 * and aggregate scores across ratings from 1 to 5.
 */
export class Review {
  /**
   * Only completed bookings can be reviewed.
   *
   * @param status Booking status.
   * @returns Returns no value; throws HTTP 409 if the booking is not completed.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static requireCompletedBooking(status: BookingStatus) {
    ensure(
      status === BookingStatus.COMPLETED,
      'Review requires completed booking',
      'conflict',
    );
  }

  /**
   * Only visible reviews can be edited or replied to.
   *
   * @param status Review visibility status.
   * @returns Returns no value; throws HTTP 409 if the review has been deleted or hidden.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static requireVisible(status: ReviewStatus) {
    ensure(status === ReviewStatus.VISIBLE, 'Review is hidden', 'conflict');
  }

  /**
   * The review's new status after a hide or restore action. Customers may delete a review that has not already been deleted (even if an admin has hidden it); admins may hide only visible reviews and restore only reviews hidden by an admin, so a review deleted by its customer
   * will not become visible
   * again.
   *
   * @param action `delete` (customer deletes their own review), `hide` (admin hides it), or `restore` (admin makes it visible again).
   * @param status Current review status.
   * @returns New status; throws HTTP 409 if the transition is not allowed from the current status.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static nextStatus(
    action: ReviewVisibilityAction,
    status: ReviewStatus,
  ): ReviewStatus {
    switch (action) {
      case 'delete':
        ensure(
          status !== ReviewStatus.DELETED_BY_AUTHOR,
          'Review is already deleted',
          'conflict',
        );
        return ReviewStatus.DELETED_BY_AUTHOR;
      case 'hide':
        ensure(
          status === ReviewStatus.VISIBLE,
          'Only visible reviews can be hidden',
          'conflict',
        );
        return ReviewStatus.HIDDEN_BY_ADMIN;
      case 'restore':
        ensure(
          status === ReviewStatus.HIDDEN_BY_ADMIN,
          'Only reviews hidden by an admin can be restored',
          'conflict',
        );
        return ReviewStatus.VISIBLE;
    }
  }

  /**
   * An edit must change at least one field; an empty body must not be marked as edited.
   *
   * @param fields Fields supplied by the customer for the update.
   * @returns Returns no value; throws HTTP 400 if no fields were supplied.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static requireChanges(fields: Record<string, unknown>) {
    ensure(
      Object.values(fields).some((value) => value !== undefined),
      'Nothing to update',
    );
  }

  /**
   * Authors may edit a review within 7 days of submitting it.
   *
   * @param createdAt Time the review was written, in ISO format.
   * @param now Current time in milliseconds.
   * @returns Returns no value; throws HTTP 409 if more than 7 days have passed.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static requireEditWindow(createdAt: string, now = Date.now()) {
    ensure(
      now - Date.parse(createdAt) <=
        REVIEW_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      'Review editing window expired',
      'conflict',
    );
  }

  /**
   * Aggregate score calculated from the count of reviews at each rating level (computed in SQL).
   *
   * @param counts Counts for each score from 1 to 5 and the number of reviews with that score.
   * @returns `{ average_rating, total_feedbacks, distribution }`
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static summaryFromCounts(
    counts: readonly { rating: number; count: number }[],
  ) {
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let total = 0,
      sum = 0;
    for (const { rating, count } of counts) {
      ensure(
        Number.isInteger(rating) && rating >= 1 && rating <= 5,
        'Rating must be an integer from 1 to 5',
      );
      distribution[rating] += count;
      total += count;
      sum += rating * count;
    }
    return {
      average_rating: total ? sum / total : 0,
      total_feedbacks: total,
      distribution,
    };
  }
}
