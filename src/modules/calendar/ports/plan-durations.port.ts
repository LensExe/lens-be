import type { EntityManager } from 'typeorm';

/** Thời lượng gói chụp đang bán của thợ (module photographer), để giờ làm không ngắn hơn gói. */
export abstract class PlanDurationsPort {
  /**
   * Thời lượng gói đang bán dài nhất của thợ, tính bằng phút.
   *
   * @param manager EntityManager của transaction bên gọi
   * @param photographerId ID hồ sơ thợ
   * @returns Số phút; 0 nếu không có gói nào đang bán
   */
  abstract longestActivePlanMinutes(
    manager: EntityManager,
    photographerId: string,
  ): Promise<number>;
}
