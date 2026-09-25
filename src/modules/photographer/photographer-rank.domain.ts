import { ensure } from '@shared/domain/domain.error';

/** Hạng của thợ, tăng dần theo số buổi chụp đã hoàn tất. */
export type PhotographerRankCode =
  'newbie' | 'bronze' | 'silver' | 'gold' | 'diamond';

/**
 * Bảng hạng (D3, D4): mốc số buổi completed tối thiểu và % commission sàn thu.
 * Xếp từ hạng cao xuống để tìm mốc đầu tiên thỏa.
 */
const RANKS: readonly {
  rank: PhotographerRankCode;
  minCompleted: number;
  commissionPercent: number;
}[] = [
  { rank: 'diamond', minCompleted: 120, commissionPercent: 5 },
  { rank: 'gold', minCompleted: 60, commissionPercent: 7 },
  { rank: 'silver', minCompleted: 30, commissionPercent: 8 },
  { rank: 'bronze', minCompleted: 10, commissionPercent: 9 },
  { rank: 'newbie', minCompleted: 0, commissionPercent: 10 },
];

/** Quy tắc xếp hạng thợ và mức commission tương ứng. */
export class PhotographerRank {
  /**
   * Tính hạng và % commission từ số buổi chụp đã hoàn tất.
   *
   * @param completedBookings Số booking `completed` của thợ (`photographer_ratings.total_bookings`)
   * @returns `{ rank, commission_percent }`; ném `invalid` (400) nếu số âm hoặc không nguyên
   */
  static of(completedBookings: number) {
    ensure(
      Number.isInteger(completedBookings) && completedBookings >= 0,
      'completedBookings must be a non-negative integer',
    );
    const tier = RANKS.find((r) => completedBookings >= r.minCompleted)!;
    return { rank: tier.rank, commission_percent: tier.commissionPercent };
  }
}
