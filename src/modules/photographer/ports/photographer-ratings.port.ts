import type { EntityManager } from 'typeorm';

/** Thống kê rating của một thợ; thợ chưa có số liệu thì mọi số là 0. */
export interface PhotographerRatingStats {
  /** Điểm trung bình của review đang hiện (0 khi chưa có review) */
  average_rating: number;
  /** Số review đang hiện */
  total_feedbacks: number;
  /** Số booking đã hoàn tất */
  total_bookings: number;
  /** Số khách hoàn tất từ hai booking trở lên với thợ */
  return_customers: number;
}

/** Rating và điểm review của thợ (module feedback), để dựng hồ sơ và xét huy hiệu. */
export abstract class PhotographerRatingsPort {
  /**
   * Thống kê rating của nhiều thợ trong một query.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerIds ID hồ sơ các thợ
   * @returns Map ID thợ → thống kê; mọi thợ được hỏi đều có mặt (chưa có số liệu thì toàn 0)
   */
  abstract ratingsOf(
    manager: EntityManager,
    photographerIds: readonly string[],
  ): Promise<Record<string, PhotographerRatingStats>>;

  /**
   * Điểm đúng giờ trung bình của thợ, chỉ tính review đang hiện.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @returns Điểm trung bình, 0 nếu chưa có review
   */
  abstract averagePunctuality(
    manager: EntityManager,
    photographerId: string,
  ): Promise<number>;

  /**
   * Tạo rating rỗng cho thợ mới (đã có thì bỏ qua).
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @returns Không trả gì
   */
  abstract openRating(
    manager: EntityManager,
    photographerId: string,
  ): Promise<void>;
}
