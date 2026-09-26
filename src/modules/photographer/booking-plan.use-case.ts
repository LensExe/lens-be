import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Injectable } from '@nestjs/common';
import {
  photographer,
  publicPhotographer,
  required,
} from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingPlan } from './booking-plan.domain';
import { WorkingHoursPort } from './ports/working-hours.port';

/**
 * Nghiệp vụ gói chụp (booking plan): thợ tự tạo, sửa, bật/tắt, xoá gói; khách xem gói đang bán.
 */
@Injectable()
export class BookingPlanUseCases {
  constructor(private readonly workingHours: WorkingHoursPort) {}

  /**
   * Lấy gói chụp và đảm bảo gói thuộc hồ sơ thợ của người đang gọi.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (lấy từ token)
   * @param id ID gói chụp (`booking_plans.id`)
   * @returns Bản ghi gói chụp; 404 nếu không có gói, 403 nếu gói của thợ khác
   */
  private async own(s: EntityManager, a: Actor, id: string) {
    const p = await photographer(s, a),
      plan = await required(s, 'booking_plans', id);
    ensure(
      plan.photographer_id === p.id,
      'Booking plan access denied',
      'forbidden',
    );
    return plan;
  }

  /**
   * Thợ tạo gói chụp mới cho hồ sơ của mình.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (phải có hồ sơ thợ)
   * @param i Thông tin gói: tên, giá (VND), thời lượng, số ảnh, số ảnh retouch, quyền lợi
   * @returns Gói chụp vừa tạo; 400 nếu số ảnh retouch lớn hơn số ảnh giao, hoặc gói dài hơn ca làm dài nhất
   */
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanCreateCommandInput,
  ) {
    const p = await photographer(s, a);
    BookingPlan.assertPhotoCounts(i.photo_count, i.retouched_photo_count);
    BookingPlan.assertFitsShift(
      i.duration_minutes,
      await this.workingHours.longestShiftMinutes(s, p.id),
    );
    return s.save(EntitySchemas.booking_plans, {
      ...i,
      features: i.features ?? [],
      photographer_id: p.id,
    });
  }

  /**
   * Thợ sửa gói của mình; bật/tắt gói bằng `is_active`.
   * Trường không gửi thì giữ giá trị cũ (kể cả khi kiểm số ảnh retouch).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (phải là chủ gói)
   * @param i ID gói và các trường cần đổi
   * @returns Gói chụp sau khi sửa; 400 nếu gói còn bán mà dài hơn ca làm dài nhất
   */
  async update(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanUpdateCommandInput,
  ) {
    const { id, ...fields } = i;
    const plan = await this.own(s, a, id);
    BookingPlan.assertPhotoCounts(
      fields.photo_count ?? plan.photo_count,
      fields.retouched_photo_count ?? plan.retouched_photo_count,
    );
    // chỉ gói còn bán mới cần đặt được; gói đã tắt thì cho sửa tự do
    if (fields.is_active ?? plan.is_active)
      BookingPlan.assertFitsShift(
        fields.duration_minutes ?? plan.duration_minutes,
        await this.workingHours.longestShiftMinutes(s, plan.photographer_id),
      );
    return updateEntity(s, EntitySchemas.booking_plans, id, fields);
  }

  /**
   * Thợ xoá gói chưa có booking nào. Gói đã có booking chỉ được tắt (409).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (phải là chủ gói)
   * @param i ID gói cần xoá
   * @returns `{ deleted: true }`
   */
  async remove(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanRemoveCommandInput,
  ) {
    await this.own(s, a, i.id);
    BookingPlan.assertRemovable(
      await s.countBy(EntitySchemas.bookings, { booking_plan_id: i.id }),
    );
    await s.delete(EntitySchemas.booking_plans, i.id);
    return { deleted: true };
  }

  /**
   * Thợ xem mọi gói của mình, kể cả gói đã tắt.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (phải có hồ sơ thợ)
   * @returns `{ items }`: danh sách gói, cũ nhất trước; mỗi gói có `fits_working_hours` = gói còn nằm vừa
   *   ca làm dài nhất (thợ thu ngắn giờ làm thì gói dài hơn sẽ `false`, tức khách không đặt được)
   */
  async me(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    const longestShift = await this.workingHours.longestShiftMinutes(s, p.id);
    const plans = await s.find(EntitySchemas.booking_plans, {
      where: { photographer_id: p.id },
      order: { created_at: 'ASC' },
    });
    return {
      items: plans.map((plan) => ({
        ...plan,
        fits_working_hours: BookingPlan.fitsShift(
          plan.duration_minutes,
          longestShift,
        ),
      })),
    };
  }

  /**
   * Khách xem các gói đang bán của một thợ (public, không cần đăng nhập).
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param i ID hồ sơ thợ (`photographers.id`)
   * @returns `{ items }`: gói đang bật, giá thấp trước; 404 nếu thợ không tồn tại hoặc bị khoá
   */
  async list(s: EntityManager, _a: Actor, i: Inputs.BookingPlanListQueryInput) {
    const { photographer: p } = await publicPhotographer(s, i.id);
    return {
      items: await s.find(EntitySchemas.booking_plans, {
        where: { photographer_id: p.id, is_active: true },
        order: { price: 'ASC' },
      }),
    };
  }
}
