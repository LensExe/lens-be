import type { BadgeMetric } from '@shared/database/entities/badge.entity';

/** Số liệu đầu vào để xét huy hiệu, lấy từ review đang hiện và thống kê booking. */
export interface BadgeStats {
  /** Điểm đánh giá tổng trung bình (1–5) của các review đang hiện */
  averageRating: number;
  /** Điểm đúng giờ trung bình (1–5) của các review đang hiện */
  averagePunctuality: number;
  /** Số review đang hiện */
  visibleReviews: number;
  /** Số khách đã đặt thành công từ 2 lần trở lên */
  returnCustomers: number;
}

/** Luật của một huy hiệu trong danh mục `badges`. */
export interface BadgeRule {
  /** Mã huy hiệu */
  code: string;
  /** Chỉ số dùng để xét */
  metric: BadgeMetric;
  /** Giá trị tối thiểu của chỉ số */
  min_value: number;
  /** Số review đang hiện tối thiểu (0 = không yêu cầu) */
  min_reviews: number;
  /** Tắt thì không cấp mới */
  is_active: boolean;
}

/** Cách lấy giá trị của từng chỉ số từ số liệu thợ. */
const METRICS: Record<BadgeMetric, (stats: BadgeStats) => number> = {
  average_rating: (stats) => stats.averageRating,
  average_punctuality: (stats) => stats.averagePunctuality,
  return_customers: (stats) => stats.returnCustomers,
};

/** Quy tắc cấp huy hiệu cho thợ; ngưỡng lấy từ danh mục `badges`. */
export class Badge {
  /**
   * Xét các huy hiệu thợ đạt được: huy hiệu đang bật, đủ số review tối thiểu và chỉ số ≥ ngưỡng.
   *
   * @param stats Số liệu review và khách quay lại của thợ
   * @param rules Danh mục huy hiệu
   * @returns Mã các huy hiệu đạt được, theo thứ tự của danh mục
   */
  static earned(stats: BadgeStats, rules: readonly BadgeRule[]) {
    return rules
      .filter(
        (rule) =>
          rule.is_active &&
          stats.visibleReviews >= rule.min_reviews &&
          METRICS[rule.metric](stats) >= rule.min_value,
      )
      .map((rule) => rule.code);
  }
}
