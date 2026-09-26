import { ensure } from '@shared/domain/domain.error';
import { interval, overlaps } from '@shared/domain/booking-values';
import {
  WorkSchedule,
  vnDate,
  vnDayInterval,
  type WorkingShift,
} from '@shared/domain/work-schedule';
import { OCCUPIED_BOOKING_STATUSES } from '@shared/database/entities/booking.entity';

type Range = { from: string; to: string };
type CalendarBooking = Range & { status: string };

const isOccupied = (status: string): boolean =>
  (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);

/**
 * Cắt khỏi một khoảng các phần bị chiếm.
 *
 * @param part Khoảng ban đầu
 * @param blocks Các khoảng bị chiếm (chặn, booking)
 * @returns Phần còn lại, có thể rỗng hoặc bị tách làm nhiều đoạn
 */
function subtract(part: Range, blocks: readonly Range[]): Range[] {
  let parts = [part];
  for (const block of blocks)
    parts = parts.flatMap((p) =>
      !overlaps(p, block)
        ? [p]
        : [clip(p, p.from, block.from), clip(p, block.to, p.to)].filter(
            (candidate) => candidate !== null,
          ),
    );
  return parts;
}

/**
 * Phần của `range` nằm trong [from, to).
 *
 * @param range Khoảng gốc (ISO UTC)
 * @param from Mốc đầu (ISO bất kỳ múi giờ)
 * @param to Mốc cuối (ISO bất kỳ múi giờ)
 * @returns Khoảng ISO UTC, hoặc `null` nếu không còn gì
 */
function clip(range: Range, from: string, to: string): Range | null {
  const start = Math.max(Date.parse(range.from), Date.parse(from)),
    end = Math.min(Date.parse(range.to), Date.parse(to));
  return start < end
    ? { from: new Date(start).toISOString(), to: new Date(end).toISOString() }
    : null;
}

/** Calendar rules calculated from persisted facts; no I/O or framework code. */
export class Calendar {
  /**
   * Lịch trống của thợ trong một khoảng: các ca làm theo giờ Việt Nam, trừ khoảng chặn và booking đang giữ lịch.
   *
   * @param from Đầu khoảng cần xem (ISO)
   * @param to Cuối khoảng cần xem (ISO), tối đa 93 ngày sau `from`
   * @param schedule Lịch tuần thợ đã khai (rỗng ⇒ mặc định 08:00–20:00)
   * @param blockedTimes Các khoảng thợ đã chặn
   * @param bookings Booking của thợ (chỉ trạng thái giữ lịch mới bị trừ)
   * @returns Các khoảng `{ from, to }` ISO UTC còn trống, xếp theo thời gian
   */
  static availability(
    from: string,
    to: string,
    schedule: readonly WorkingShift[],
    blockedTimes: readonly Range[],
    bookings: readonly CalendarBooking[],
  ) {
    const range = interval(from, to);
    ensure(
      Date.parse(range.to) - Date.parse(range.from) <= 93 * 864e5,
      'Maximum availability window is 93 days',
    );
    const blocks: Range[] = [
      ...blockedTimes,
      ...bookings.filter((b) => isOccupied(b.status)),
    ];
    const free: Range[] = [];
    const lastDay = vnDate(new Date(Date.parse(range.to) - 1).toISOString());
    for (
      let day = vnDate(range.from);
      day <= lastDay;
      day = vnDate(vnDayInterval(day).to)
    )
      for (const shift of WorkSchedule.shifts(day, schedule)) {
        const part = clip(shift, range.from, range.to);
        if (part) free.push(...subtract(part, blocks));
      }
    return free;
  }

  /**
   * Khoảng thời gian thợ muốn chặn: nguyên ngày theo giờ Việt Nam (`date`) hoặc khoảng `from`–`to` (có thể qua nhiều ngày).
   *
   * @param input Gửi `date`, hoặc gửi cả `from` và `to`; không gửi lẫn hai kiểu
   * @returns Khoảng `{ from, to }` ISO UTC; 400 nếu gửi sai kiểu hoặc `from` không trước `to`
   */
  static blockRange(input: { date?: string; from?: string; to?: string }) {
    const byDate = input.date !== undefined,
      byRange = input.from !== undefined || input.to !== undefined;
    ensure(byDate !== byRange, 'Send either date or from and to');
    if (byDate) {
      const date = input.date!;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      ensure(
        !Number.isNaN(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === date,
        'date must be a real calendar date (YYYY-MM-DD)',
      );
      return vnDayInterval(date);
    }
    ensure(input.from && input.to, 'Send both from and to');
    return interval(input.from, input.to);
  }

  /**
   * Lịch tuần mới phải còn ít nhất một ca đủ dài cho gói đang bán dài nhất; nếu không, gói đó
   * không bao giờ đặt được (booking phải nằm trọn một ca).
   *
   * @param schedule Lịch tuần định lưu (rỗng ⇒ giờ mặc định)
   * @param longestPlanMinutes Gói đang bán dài nhất (phút); 0 nếu không có gói
   * @returns Không trả gì; 400 nếu ca dài nhất ngắn hơn gói
   */
  static assertCoversPlans(
    schedule: readonly WorkingShift[],
    longestPlanMinutes: number,
  ) {
    ensure(
      WorkSchedule.longestShiftMinutes(schedule) >= longestPlanMinutes,
      `Working hours are shorter than your longest plan on sale (${longestPlanMinutes} minutes); shorten or turn off that plan first`,
    );
  }

  /**
   * Kiểm khoảng chặn hợp lệ: chưa kết thúc, không đè booking đang giữ lịch, không chồng khoảng chặn khác.
   *
   * @param range Khoảng muốn chặn (từ `blockRange`)
   * @param bookings Booking của thợ
   * @param blockedTimes Các khoảng thợ đã chặn
   * @param now Thời điểm hiện tại (ms)
   * @returns Không trả gì; 400 nếu đã qua, 409 nếu đè booking hoặc chồng khoảng chặn khác
   */
  static assertCanBlock(
    range: Range,
    bookings: readonly CalendarBooking[],
    blockedTimes: readonly Range[],
    now: number,
  ) {
    ensure(Date.parse(range.to) > now, 'Blocked time must not be in the past');
    ensure(
      !bookings.some(
        (booking) => isOccupied(booking.status) && overlaps(booking, range),
      ),
      'Time is used by an existing booking',
      'conflict',
    );
    ensure(
      !blockedTimes.some((blocked) => overlaps(blocked, range)),
      'Time is already blocked',
      'conflict',
    );
  }
}
