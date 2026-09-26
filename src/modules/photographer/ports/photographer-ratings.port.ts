import type { EntityManager } from 'typeorm';
import type { RatingEntity } from '@shared/database/entities/rating.entity';

/** Rating và điểm review của thợ (module feedback), để dựng hồ sơ và xét huy hiệu. */
export abstract class PhotographerRatingsPort {
  /**
   * Rating tổng hợp của nhiều thợ trong một query.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerIds ID hồ sơ các thợ
   * @returns Map ID thợ → rating, `null` nếu chưa có
   */
  abstract ratingsOf(
    manager: EntityManager,
    photographerIds: readonly string[],
  ): Promise<Record<string, RatingEntity | null>>;

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
