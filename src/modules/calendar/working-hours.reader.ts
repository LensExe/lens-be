import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { WorkSchedule } from '@shared/domain/work-schedule';

/**
 * Đọc giờ làm của thợ cho module khác (photographer gọi qua `WorkingHoursPort`).
 * Tách khỏi `CalendarUseCases` để không tạo vòng phụ thuộc: `CalendarUseCases` cần thời lượng gói
 * của photographer, còn photographer cần giờ làm. Class này không phụ thuộc gì nên cắt được vòng.
 */
@Injectable()
export class WorkingHoursReader {
  /**
   * Ca làm dài nhất của thợ, tính bằng phút, để không cho tạo gói dài hơn mọi ca.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Số phút của ca dài nhất (chưa khai ⇒ 720, tức 08:00–20:00)
   */
  async longestShiftMinutes(s: EntityManager, photographerId: string) {
    return WorkSchedule.longestShiftMinutes(
      await s.findBy(EntitySchemas.working_hours, {
        photographer_id: photographerId,
      }),
    );
  }
}
