import type { EntityManager } from 'typeorm';

/** Booking đang dùng gói chụp (module booking), để không xoá gói đã có booking. */
export abstract class PlanBookingsPort {
  /**
   * Số booking (mọi trạng thái) đang dùng một gói.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param planId ID gói chụp
   * @returns Số booking
   */
  abstract bookingCountForPlan(
    manager: EntityManager,
    planId: string,
  ): Promise<number>;
}
