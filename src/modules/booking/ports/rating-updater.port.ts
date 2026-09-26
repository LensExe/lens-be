import type { EntityManager } from 'typeorm';

/** Ghi số liệu booking vào rating của thợ (module feedback), trong transaction của bên gọi. */
export abstract class RatingUpdaterPort {
  /**
   * Ghi số booking hoàn tất và số khách quay lại của thợ (booking tự đếm trên bảng của mình).
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @param stats `completedBookings`, `returnCustomers`
   * @returns Không trả gì
   */
  abstract recordBookingStats(
    manager: EntityManager,
    photographerId: string,
    stats: { completedBookings: number; returnCustomers: number },
  ): Promise<void>;
}
