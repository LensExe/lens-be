import type { EntityManager } from 'typeorm';

/** Các buổi thợ đi chụp liên kết đã nhận lời, để lịch trống và chặn lịch tính như lịch đã bận. */
export abstract class CollaborationTimesPort {
  /**
   * Buổi liên kết (lời mời đã nhận, booking còn giữ lịch) của thợ chồng lên khoảng giờ.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ liên kết
   * @param range Khoảng giờ cần xét
   * @returns Các khoảng `{ from, to, status }` của booking mà thợ tham gia
   */
  abstract collaborationTimes(
    manager: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ): Promise<{ from: string; to: string; status: string }[]>;
}
