import { ensure } from '@shared/domain/domain.error';
import { interval, overlaps } from '@shared/domain/booking-values';
import { vnDayInterval } from '@shared/domain/work-schedule';
import { OCCUPIED_BOOKING_STATUSES } from '@shared/database/entities/booking.entity';

type Range = { from: string; to: string };
type CalendarBooking = Range & { status: string };

const isOccupied = (status: string): boolean =>
  (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);

/** Calendar rules calculated from persisted facts; no I/O or framework code. */
export class Calendar {
  static availability(
    from: string,
    to: string,
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
    const firstDay = new Date(range.from);
    firstDay.setUTCHours(0, 0, 0, 0);
    for (
      let day = firstDay.getTime();
      day < Date.parse(range.to);
      day += 864e5
    ) {
      let parts: Range[] = [
        {
          from: new Date(Math.max(day, Date.parse(range.from))).toISOString(),
          to: new Date(
            Math.min(day + 864e5, Date.parse(range.to)),
          ).toISOString(),
        },
      ].filter((part) => part.from < part.to);
      for (const block of blocks)
        parts = parts.flatMap((part) =>
          !overlaps(part, block)
            ? [part]
            : [
                {
                  from: part.from,
                  to: new Date(
                    Math.min(Date.parse(part.to), Date.parse(block.from)),
                  ).toISOString(),
                },
                {
                  from: new Date(
                    Math.max(Date.parse(part.from), Date.parse(block.to)),
                  ).toISOString(),
                  to: part.to,
                },
              ].filter((candidate) => candidate.from < candidate.to),
        );
      free.push(...parts);
    }
    return free.sort((a, b) => a.from.localeCompare(b.from));
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
    if (byDate) return vnDayInterval(input.date!);
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
