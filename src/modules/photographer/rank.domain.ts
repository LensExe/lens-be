import { ensure } from '@shared/domain/domain.error';

/** Một hạng trong danh mục `ranks`. */
export interface RankRule {
  /** Mã hạng (ví dụ: 'gold') */
  code: string;
  /** Tên hiển thị (ví dụ: 'Vàng') */
  name: string;
  /** Số buổi hoàn tất tối thiểu để đạt hạng */
  min_completed: number;
  /** % commission sàn thu ở hạng này */
  commission_percent: number;
}

/** Quy tắc xếp hạng thợ và mức commission tương ứng; con số lấy từ danh mục `ranks`. */
export class Rank {
  /**
   * Tìm hạng của thợ: hạng có mốc cao nhất mà số buổi hoàn tất đạt tới.
   *
   * @param completedBookings Số booking `completed` của thợ (`photographer_ratings.total_bookings`)
   * @param rules Danh mục hạng (thứ tự bất kỳ), phải có hạng mốc 0
   * @returns Hạng đạt được; ném `invalid` (400) nếu số buổi âm / không nguyên hoặc danh mục thiếu mốc 0
   */
  static of(completedBookings: number, rules: readonly RankRule[]): RankRule {
    ensure(
      Number.isInteger(completedBookings) && completedBookings >= 0,
      'completedBookings must be a non-negative integer',
    );
    Rank.assertCatalog(rules);
    return [...rules]
      .sort((x, y) => y.min_completed - x.min_completed)
      .find((rule) => completedBookings >= rule.min_completed)!;
  }

  /**
   * Danh mục hạng phải có hạng mốc 0 buổi, để thợ nào cũng có hạng.
   *
   * @param rules Danh mục hạng
   * @returns Không trả gì; ném `invalid` (400) nếu thiếu hạng mốc 0
   */
  static assertCatalog(rules: readonly RankRule[]) {
    ensure(
      rules.some((rule) => rule.min_completed === 0),
      'Rank catalog must contain a rank starting at 0 completed bookings',
    );
  }
}
