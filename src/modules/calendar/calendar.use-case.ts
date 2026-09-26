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
import { CollaborationTimesPort } from './ports/collaboration-times.port';
import {
  DEFAULT_WORKING_HOURS,
  WorkSchedule,
} from '@shared/domain/work-schedule';
import { ensure } from '@shared/platform/exceptions/domain.error';

/** Lý do ghi cho yêu cầu pending bị từ chối vì thợ chặn đúng giờ đó. */
const BLOCKED_REASON = 'Photographer blocked this time';

/** Lý do ghi cho yêu cầu pending bị từ chối vì nằm ngoài giờ làm mới của thợ. */
const HOURS_CHANGED_REASON = 'Photographer changed working hours';

/** Application use cases for photographer calendar operations. */
@Injectable()
export class CalendarUseCases {
  constructor(
    private readonly pendingBookings: PendingBookingsPort,
    private readonly collaborations: CollaborationTimesPort,
  ) {}

  /**
   * Khách xem lịch trống của thợ (public): ca làm theo giờ Việt Nam trừ khoảng chặn, booking và
   * các buổi thợ đi chụp liên kết.
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
        [
          ...(await s.find(
            EntitySchemas.bookings,
            this.overlapping(p.id, window),
          )),
          ...(await this.collaborations.collaborationTimes(s, p.id, window)),
        ],
      ),
    };
  }

  /**
   * Ca làm dài nhất của thợ, tính bằng phút. Module photographer gọi qua port để không cho tạo gói
   * chụp dài hơn mọi ca (gói như vậy không bao giờ đặt được).
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
   * Yêu cầu đang chờ nằm ngoài giờ làm mới thì thợ phải gửi `decline_pending: true` (xem trước bằng
   * `workingHoursPreview`); khi đó các yêu cầu này bị từ chối kèm lý do. Booking đã nhận giữ nguyên.
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
    const p = await this.lockedPhotographer(s, a);
    WorkSchedule.assertValid(input.items);
    const affected = await this.pendingBookings.pendingOutside(
      s,
      p.id,
      input.items,
    );
    this.assertConsent(affected.length, input.decline_pending);
    await s.delete(EntitySchemas.working_hours, { photographer_id: p.id });
    for (const shift of input.items)
      await s.save(EntitySchemas.working_hours, {
        ...shift,
        photographer_id: p.id,
      });
    await this.pendingBookings.decline(
      s,
      affected.map((b) => b.id),
      HOURS_CHANGED_REASON,
    );
    return this.workingHours(s, a);
  }

  /**
   * Xem trước: các yêu cầu đang chờ sẽ bị từ chối nếu thợ lưu lịch tuần này.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input Lịch tuần định lưu
   * @returns `{ items }` các yêu cầu bị ảnh hưởng; 400 nếu lịch sai
   */
  async workingHoursPreview(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarWorkingHoursPreviewQueryInput,
  ) {
    const p = await photographer(s, a);
    WorkSchedule.assertValid(input.items);
    return {
      items: await this.pendingBookings.pendingOutside(s, p.id, input.items),
    };
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
   * Có yêu cầu đang chờ chồng giờ thì thợ phải gửi `decline_pending: true` (xem trước bằng `blockPreview`);
   * khi đó các yêu cầu này bị từ chối kèm lý do.
   *
   * @param input `date`, hoặc `from` + `to`; kèm `reason`, `decline_pending` tuỳ chọn
   * @returns Khoảng chặn vừa lưu; 400 nếu sai kiểu hoặc đã qua, 409 nếu đè booking, chồng khoảng chặn khác,
   *   hoặc có yêu cầu đang chờ mà chưa đồng ý từ chối
   */
  async block(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockCommandInput,
  ) {
    const p = await this.lockedPhotographer(s, a);
    const range = Calendar.blockRange(input);
    Calendar.assertCanBlock(
      range,
      [
        ...(await s.find(
          EntitySchemas.bookings,
          this.overlapping(p.id, range),
        )),
        ...(await this.collaborations.collaborationTimes(s, p.id, range)),
      ],
      await s.find(EntitySchemas.offline_slots, this.overlapping(p.id, range)),
      Date.now(),
    );
    const affected = await this.pendingBookings.pendingOverlapping(
      s,
      p.id,
      range,
    );
    this.assertConsent(affected.length, input.decline_pending);
    const slot = await s.save(EntitySchemas.offline_slots, {
      photographer_id: p.id,
      ...range,
      reason: input.reason ?? null,
    });
    await this.pendingBookings.decline(
      s,
      affected.map((b) => b.id),
      BLOCKED_REASON,
    );
    return slot;
  }

  /**
   * Xem trước: các yêu cầu đang chờ sẽ bị từ chối nếu thợ chặn khoảng này.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input `date`, hoặc `from` + `to` (giống khi chặn)
   * @returns `{ items }` các yêu cầu bị ảnh hưởng; 400 nếu khoảng sai
   */
  async blockPreview(
    s: EntityManager,
    a: Actor,
    input: Inputs.CalendarBlockPreviewQueryInput,
  ) {
    const p = await photographer(s, a);
    return {
      items: await this.pendingBookings.pendingOverlapping(
        s,
        p.id,
        Calendar.blockRange(input),
      ),
    };
  }

  /**
   * Hồ sơ thợ đang đăng nhập, khoá dòng để không chạy song song với tạo/nhận booking
   * (bên booking cũng khoá dòng này).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @returns Hồ sơ thợ
   */
  private async lockedPhotographer(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    await s.findOne(EntitySchemas.photographers, {
      where: { id: p.id },
      lock: { mode: 'pessimistic_write' },
    });
    return p;
  }

  /**
   * Thợ phải đồng ý trước khi thay đổi lịch làm từ chối yêu cầu đang chờ của khách.
   *
   * @param affected Số yêu cầu đang chờ bị ảnh hưởng
   * @param declinePending Thợ đã gửi `decline_pending: true` chưa
   * @returns Không trả gì; 409 nếu có yêu cầu bị ảnh hưởng mà thợ chưa đồng ý
   */
  private assertConsent(affected: number, declinePending: boolean | undefined) {
    ensure(
      affected === 0 || declinePending === true,
      `${affected} pending request(s) would be declined; send decline_pending: true to go ahead`,
      'conflict',
    );
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
