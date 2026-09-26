import type { EntityManager } from 'typeorm';

/** Số tiền khách đã trả cho booking (module payment), để biết đã đủ cọc / đủ tiền chưa. */
export abstract class PaidAmountsPort {
  /**
   * Tổng tiền đã trả (cọc + phần còn lại, giao dịch `paid`) cho từng booking, một query cho cả danh sách.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param bookingIds ID các booking
   * @returns Map ID booking → số tiền VND (0 nếu chưa trả gì)
   */
  abstract paidAmounts(
    manager: EntityManager,
    bookingIds: readonly string[],
  ): Promise<Record<string, number>>;
}
