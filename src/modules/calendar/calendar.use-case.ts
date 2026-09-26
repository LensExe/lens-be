import { LessThan, MoreThan, type EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  photographer,
  publicPhotographer,
  required,
} from '@shared/common/access';
import { Calendar } from './calendar.domain';
import { PendingBookingsPort } from './ports/pending-bookings.port';
import {
  DEFAULT_WORKING_HOURS,
  WorkSchedule,
} from '@shared/domain/work-schedule';
import { ensure } from '@shared/platform/exceptions/domain.error';

/** Lý do ghi cho yêu cầu pending bị từ chối vì thợ chặn đúng giờ đó. */
const BLOCKED_REASON = 'Photographer blocked this time';

/** Application use cases for photographer calendar operations. */
@Injectable()
export class CalendarUseCases {
  constructor(private readonly pendingBookings: PendingBookingsPort) {}

  /**
   * Khách xem lịch trống của thợ (public): ca làm theo giờ Việt Nam trừ khoảng chặn và booking.
   * Chỉ thợ đã duyệt, tài khoản active; thợ tắt nhận lịch (`is_available = false`) thì rỗng.
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param input ID hồ sơ thợ; `from`/`to` mặc định từ bây giờ tới 30 ngày sau
   * @returns `{ items }`: các khoảng `{ from, to }` còn trống; 404 nếu thợ không public
   */
  async availability(
    s: EntityManager,
    _a: Actor,
    input: Inputs.CalendarAvailabilityQueryInput,
  ) {
    const { photographer: p } = await publicPhotographer(s, input.id);
    if (!p.is_available) return { items: [] };
    const from = input.from ?? new Date().toISOString();
    const to = input.to ?? new Date(Date.now() + 30 * 864e5).toISOString();
    const window = { from, to };
    return {
      items: Calendar.availability(
        from,
        to,
        await s.findBy(EntitySchemas.working_hours, { photographer_id: p.id }),
        await s.find(
          EntitySchemas.offline_slots,
          this.overlapping(p.id, window),
        ),
        await s.find(EntitySchemas.bookings, this.overlapping(p.id, window)),
      ),
    };
  }

  /**
   * Thợ xem lịch làm việc theo tuần của mình.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @returns `{ items, is_default }`; chưa khai thì `items` là giờ mặc định 08:00–20:00 và `is_default = true`
   */
  async workingHours(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    const items = await s.find(EntitySchemas.working_hours, {
      where: { photographer_id: p.id },
      order: { weekday: 'ASC', start_time: 'ASC' },
    });
    return items.length
      ? {
          items: items.map(({ weekday, start_time, end_time }) => ({
            weekday,
            start_time,
            end_time,
          })),
          is_default: false,
        }
      : { items: [...DEFAULT_WORKING_HOURS], is_default: true };
  }

  /**
   * Thợ thay toàn bộ lịch làm việc theo tuần. Danh sách rỗng ⇒ quay về giờ mặc định 08:00–20:00.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input Các ca làm mới (thứ 1–7, giờ `HH:MM` theo giờ Việt Nam)
   * @returns Lịch làm việc sau khi lưu; 400 nếu giờ sai hoặc các ca cùng thứ chồng nhau
   */
  async setWorkingHours(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarSetWorkingHoursCommandInput,
  ) {
    const p = await photographer(s, a);
    WorkSchedule.assertValid(input.items);
    await s.delete(EntitySchemas.working_hours, { photographer_id: p.id });
    for (const shift of input.items)
      await s.save(EntitySchemas.working_hours, {
        ...shift,
        photographer_id: p.id,
      });
    return this.workingHours(s, a);
  }

  /**
   * Thợ xem lịch của mình: các khoảng đã chặn và booking, lọc theo khoảng thời gian nếu có.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input `from`: chỉ lấy mục kết thúc sau mốc này; `to`: chỉ lấy mục bắt đầu trước mốc này
   * @returns `{ blocked, bookings }`, xếp theo thời gian bắt đầu
   */
  async me(s: EntityManager, a: Actor, input: Inputs.CalendarMeQueryInput) {
    const p = await photographer(s, a);
    return {
      blocked: await s.find(
        EntitySchemas.offline_slots,
        this.overlapping(p.id, input),
      ),
      bookings: await s.find(
        EntitySchemas.bookings,
        this.overlapping(p.id, input),
      ),
    };
  }

  /**
   * Thợ chặn một khoảng bận: nguyên ngày theo giờ Việt Nam hoặc khoảng `from`–`to` (có thể qua nhiều ngày).
   * Khoá dòng hồ sơ thợ để không chạy song song với tạo booking (booking cũng khoá dòng này).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input `date`, hoặc `from` + `to`; kèm `reason` tuỳ chọn
   * @returns Khoảng chặn vừa lưu; 400 nếu sai kiểu hoặc đã qua, 409 nếu đè booking hoặc chồng khoảng chặn khác
   */
  async block(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockCommandInput,
  ) {
    const p = await photographer(s, a);
    await s.findOne(EntitySchemas.photographers, {
      where: { id: p.id },
      lock: { mode: 'pessimistic_write' },
    });
    const range = Calendar.blockRange(input);
    Calendar.assertCanBlock(
      range,
      await s.find(EntitySchemas.bookings, this.overlapping(p.id, range)),
      await s.find(EntitySchemas.offline_slots, this.overlapping(p.id, range)),
      Date.now(),
    );
    const slot = await s.save(EntitySchemas.offline_slots, {
      photographer_id: p.id,
      ...range,
      reason: input.reason ?? null,
    });
    await this.pendingBookings.turnDownOverlapping(
      s,
      p.id,
      range,
      BLOCKED_REASON,
    );
    return slot;
  }

  async unblock(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarUnblockCommandInput,
  ) {
    const p = await photographer(s, a),
      slot = await required(s, 'offline_slots', input.id);
    ensure(slot.photographer_id === p.id, 'Slot access denied', 'forbidden');
    await s.delete(EntitySchemas.offline_slots, slot.id);
    return { deleted: true };
  }

  /**
   * Điều kiện tìm các mục (khoảng chặn, booking) của thợ chồng lên [from, to); mốc nào không gửi thì không lọc phía đó.
   *
   * @param photographerId ID hồ sơ thợ
   * @param window `from`/`to` ISO, đều tuỳ chọn
   * @returns Tuỳ chọn `find` của TypeORM, xếp theo `from` tăng dần
   */
  private overlapping(
    photographerId: string,
    window: { from?: string; to?: string },
  ) {
    return {
      where: {
        photographer_id: photographerId,
        ...(window.from !== undefined && { to: MoreThan(window.from) }),
        ...(window.to !== undefined && { from: LessThan(window.to) }),
      },
      order: { from: 'ASC' as const },
    };
  }
}
