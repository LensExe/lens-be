import type { EntityManager } from 'typeorm';
import type { BookingEntity } from '@shared/database/entities/booking.entity';

/** Booking của thợ (module booking), để calendar dựng lịch trống, lịch của thợ và kiểm chặn lịch. */
export abstract class PhotographerBookingsPort {
  /**
   * Booking của thợ (mọi trạng thái) chồng lên khung giờ, xếp theo giờ bắt đầu.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @param window `from` / `to` ISO, đều tuỳ chọn
   * @returns Các booking chồng lên khung giờ
   */
  abstract bookingsOverlapping(
    manager: EntityManager,
    photographerId: string,
    window: { from?: string; to?: string },
  ): Promise<BookingEntity[]>;
}
