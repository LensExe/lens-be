import type { EntityManager } from 'typeorm';

/** Giờ làm của thợ (module calendar), để gói chụp không dài hơn mọi ca làm. */
export abstract class WorkingHoursPort {
  /**
   * Ca làm dài nhất của thợ, tính bằng phút (chưa khai giờ làm ⇒ giờ mặc định 08:00–20:00).
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @returns Số phút của ca dài nhất
   */
  abstract longestShiftMinutes(
    manager: EntityManager,
    photographerId: string,
  ): Promise<number>;
}
