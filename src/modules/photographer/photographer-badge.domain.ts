/** Mã huy hiệu thợ (D11). */
export type PhotographerBadgeCode = 'top-rated' | 'punctual' | 'loyal';

/** Số liệu đầu vào để xét huy hiệu, lấy từ review đang hiện và thống kê booking. */
export interface PhotographerBadgeStats {
  /** Điểm đánh giá tổng trung bình (1–5) của các review đang hiện */
  averageRating: number;
  /** Điểm đúng giờ trung bình (1–5) của các review đang hiện */
  averagePunctuality: number;
  /** Số review đang hiện */
  visibleReviews: number;
  /** Số khách đã đặt thành công từ 2 lần trở lên */
  returnCustomers: number;
}

/** Ngưỡng xét huy hiệu (D11). */
const MIN_REVIEWS = 10;
const MIN_AVERAGE = 4.8;
const MIN_RETURN_CUSTOMERS = 5;

/** Quy tắc cấp huy hiệu cho thợ. */
export class PhotographerBadges {
  /**
   * Xét các huy hiệu thợ đạt được.
   * - `top-rated`: điểm trung bình ≥ 4.8 trên ít nhất 10 review đang hiện.
   * - `punctual`: điểm đúng giờ trung bình ≥ 4.8 trên ít nhất 10 review đang hiện.
   * - `loyal`: ít nhất 5 khách quay lại.
   *
   * @param stats Số liệu review và khách quay lại của thợ
   * @returns Danh sách mã huy hiệu theo thứ tự cố định top-rated, punctual, loyal
   */
  static of(stats: PhotographerBadgeStats): PhotographerBadgeCode[] {
    const enoughReviews = stats.visibleReviews >= MIN_REVIEWS,
      badges: PhotographerBadgeCode[] = [];
    if (enoughReviews && stats.averageRating >= MIN_AVERAGE)
      badges.push('top-rated');
    if (enoughReviews && stats.averagePunctuality >= MIN_AVERAGE)
      badges.push('punctual');
    if (stats.returnCustomers >= MIN_RETURN_CUSTOMERS) badges.push('loyal');
    return badges;
  }
}
