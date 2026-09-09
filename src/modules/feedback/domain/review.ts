import { ensure } from '@shared/platform/exceptions/domain.error';

export class Review {
  static requireCompletedBooking(status: string) {
    ensure(
      status === 'completed',
      'Review requires completed booking',
      'conflict',
    );
  }
  static requireEditWindow(createdAt: string, now = Date.now()) {
    ensure(
      now - Date.parse(createdAt) <= 7 * 864e5,
      'Review editing window expired',
      'conflict',
    );
  }
  static summary(ratings: number[]) {
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const rating of ratings) {
      ensure(
        Number.isInteger(rating) && rating >= 1 && rating <= 5,
        'Rating must be an integer from 1 to 5',
      );
      distribution[rating]++;
    }
    return {
      average_rating: ratings.length
        ? ratings.reduce((n, r) => n + r, 0) / ratings.length
        : 0,
      total_feedbacks: ratings.length,
      distribution,
    };
  }
}
