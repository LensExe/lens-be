import type { EntityManager } from 'typeorm';

/** Từ chối các yêu cầu booking đang chờ bị chặn lịch đè lên, trong transaction của bên gọi. */
export abstract class PendingBookingsPort {
  /**
   * Từ chối mọi booking `pending` của thợ chồng lên khoảng giờ, ghi lịch sử và báo realtime.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ vừa bị giữ
   * @param reason Lý do ghi vào lịch sử
   * @returns Số yêu cầu đã từ chối
   */
  abstract turnDownOverlapping(
    manager: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
    reason: string,
  ): Promise<number>;
}
