import { ensure } from '@shared/domain/domain.error';
import { ReviewStatus } from '@shared/database/entities/feedback.entity';

/** Việc đổi trạng thái hiển thị của review: khách tự xoá, admin ẩn, admin hiện lại. */
export type ReviewVisibilityAction = 'delete' | 'hide' | 'restore';

/**
 * Quy tắc review: chỉ review booking đã hoàn tất, sửa trong 7 ngày, ai được ẩn / hiện lại,
 * tổng điểm theo mức 1–5.
 */
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
   * Chỉ sửa / trả lời được review đang hiện.
   *
   * @param status Trạng thái hiển thị của review
   * @returns Không trả gì; 409 nếu review đã bị xoá hoặc ẩn
   */
  static requireVisible(status: ReviewStatus) {
    ensure(status === ReviewStatus.VISIBLE, 'Review is hidden', 'conflict');
  }

  /**
   * Trạng thái mới của review sau một việc ẩn / hiện. Khách xoá được review chưa xoá (kể cả đang bị
   * admin ẩn); admin chỉ ẩn review đang hiện và chỉ hiện lại review do admin ẩn, nên review khách đã
   * xoá không bao giờ hiện lại.
   *
   * @param action `delete` (khách tự xoá), `hide` (admin ẩn), `restore` (admin hiện lại)
   * @param status Trạng thái hiện tại của review
   * @returns Trạng thái mới; 409 nếu việc đó không làm được từ trạng thái hiện tại
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
   * Lần sửa phải đổi ít nhất một trường; body rỗng không được đánh dấu là đã sửa.
   *
   * @param fields Các trường khách gửi lên để sửa
   * @returns Không trả gì; 400 nếu không có trường nào
   */
  static requireChanges(fields: Record<string, unknown>) {
    ensure(
      Object.values(fields).some((value) => value !== undefined),
      'Nothing to update',
    );
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
