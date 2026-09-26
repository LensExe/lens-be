import { ensure } from '@shared/domain/domain.error';

/** Quy tắc review: chỉ review booking đã hoàn tất, sửa trong 7 ngày, tổng điểm theo mức 1–5. */
export class Review {
  /**
   * Chỉ review được booking đã hoàn tất.
   *
   * @param status Trạng thái booking
   * @returns Không trả gì; 409 nếu booking chưa completed
   */
  static requireCompletedBooking(status: string) {
    ensure(
      status === 'completed',
      'Review requires completed booking',
      'conflict',
    );
  }
  /**
   * Chỉ trả lời được review đang hiện.
   *
   * @param isVisible Review đang hiện hay đã bị ẩn
   * @returns Không trả gì; 409 nếu review đang ẩn
   */
  static requireVisible(isVisible: boolean) {
    ensure(isVisible, 'Review is hidden', 'conflict');
  }

  /**
   * Người viết chỉ sửa review trong 7 ngày kể từ lúc viết.
   *
   * @param createdAt Lúc viết review (ISO)
   * @param now Thời điểm hiện tại (ms)
   * @returns Không trả gì; 409 nếu đã quá 7 ngày
   */
  static requireEditWindow(createdAt: string, now = Date.now()) {
    ensure(
      now - Date.parse(createdAt) <= 7 * 864e5,
      'Review editing window expired',
      'conflict',
    );
  }

  /**
   * Tổng điểm từ số review theo từng mức điểm (đã gom trong SQL).
   *
   * @param counts Mỗi mức điểm 1–5 và số review có điểm đó
   * @returns `{ average_rating, total_feedbacks, distribution }`
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
