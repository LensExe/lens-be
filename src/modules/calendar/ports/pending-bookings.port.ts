import type { EntityManager } from 'typeorm';
import type { WorkingShift } from '@shared/domain/work-schedule';

/** Yêu cầu booking đang chờ của thợ, để calendar xem trước và từ chối khi thợ chặn lịch / đổi giờ làm. */
export interface PendingRequest {
  id: string;
  customer_id: string;
  from: string;
  to: string;
}

/** Tra và từ chối yêu cầu booking đang chờ, trong transaction của bên gọi. */
export abstract class PendingBookingsPort {
  /**
   * Yêu cầu `pending` của thợ chồng lên khoảng giờ.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ sắp bị chặn
   * @returns Các yêu cầu bị ảnh hưởng, xếp theo giờ bắt đầu
   */
  abstract pendingOverlapping(
    manager: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ): Promise<PendingRequest[]>;

  /**
   * Yêu cầu `pending` của thợ không còn nằm trọn một ca theo lịch tuần mới.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @param schedule Lịch tuần mới (rỗng ⇒ giờ mặc định)
   * @returns Các yêu cầu bị ảnh hưởng, xếp theo giờ bắt đầu
   */
  abstract pendingOutside(
    manager: EntityManager,
    photographerId: string,
    schedule: readonly WorkingShift[],
  ): Promise<PendingRequest[]>;

  /**
   * Từ chối các yêu cầu còn `pending` (system làm, kèm lý do, ghi lịch sử, bắn realtime).
   * Yêu cầu đã đổi trạng thái trong lúc đó thì bỏ qua.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param bookingIds ID các yêu cầu cần từ chối
   * @param reason Lý do ghi vào lịch sử
   * @returns Số yêu cầu đã từ chối
   */
  abstract decline(
    manager: EntityManager,
    bookingIds: readonly string[],
    reason: string,
  ): Promise<number>;
}
