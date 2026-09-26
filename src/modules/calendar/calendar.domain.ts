import { ensure } from '@shared/domain/domain.error';
import { interval, isOccupied, overlaps } from '@shared/domain/booking-values';
import {
  WorkSchedule,
  vnDate,
  vnDayInterval,
  type WorkingShift,
} from '@shared/domain/work-schedule';

type Range = { from: string; to: string };
type CalendarBooking = Range & { status: string };

/** Khung xem lịch mặc định và tối đa (ngày). */
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 93;

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

/** Quy tắc lịch của thợ (lịch trống, chặn lịch, khung xem), tính từ dữ kiện đã đọc; không I/O. */
export class Calendar {
  /**
   * Khung xem lịch trống cho khách: không bắt đầu trong quá khứ; thiếu `to` thì lấy 30 ngày kể từ `from`.
   *
   * @param input `from` / `to` khách gửi, đều tuỳ chọn
   * @param now Thời điểm hiện tại (ms)
   * @returns `{ from, to }` ISO UTC (giới hạn 93 ngày được kiểm ở `availability`)
   */
  static availabilityWindow(
    input: { from?: string; to?: string },
    now: number,
  ) {
    const from = Math.max(input.from ? Date.parse(input.from) : now, now);
    return Calendar.window(from, input.to);
  }

  /**
   * Khung xem lịch của chính thợ: được xem lại quá khứ; mặc định từ bây giờ 30 ngày; tối đa 93 ngày.
   *
   * @param input `from` / `to` thợ gửi, đều tuỳ chọn
   * @param now Thời điểm hiện tại (ms)
   * @returns `{ from, to }` ISO UTC; 400 nếu dài quá 93 ngày
   */
  static personalWindow(input: { from?: string; to?: string }, now: number) {
    const range = Calendar.window(
      input.from ? Date.parse(input.from) : now,
      input.to,
    );
    ensure(
      Date.parse(range.to) - Date.parse(range.from) <= MAX_WINDOW_DAYS * 864e5,
      `Maximum window is ${MAX_WINDOW_DAYS} days`,
    );
    return range;
  }

  /**
   * Khoảng từ `from`, thiếu `to` thì lấy `DEFAULT_WINDOW_DAYS` ngày sau `from`.
   *
   * @param from Mốc đầu (ms)
   * @param to Mốc cuối ISO, tuỳ chọn
   * @returns `{ from, to }` ISO UTC; 400 nếu `to` không sau `from`
   */
  private static window(from: number, to: string | undefined) {
    return interval(
      new Date(from).toISOString(),
      to ?? new Date(from + DEFAULT_WINDOW_DAYS * 864e5).toISOString(),
    );
  }

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
      Date.parse(range.to) - Date.parse(range.from) <= MAX_WINDOW_DAYS * 864e5,
      `Maximum window is ${MAX_WINDOW_DAYS} days`,
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
