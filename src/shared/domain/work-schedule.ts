import { ensure } from './domain.error';
import { interval } from './booking-values';

/** Việt Nam dùng UTC+7 cố định (không có giờ mùa hè). */
const VN_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 864e5;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Một ca làm trong tuần: `weekday` 1 (thứ Hai) … 7 (Chủ nhật), giờ `HH:MM` theo giờ Việt Nam. */
export interface WorkingShift {
  weekday: number;
  start_time: string;
  end_time: string;
}

/** Giờ làm mặc định khi thợ chưa khai: 08:00–20:00 mọi ngày. */
export const DEFAULT_WORKING_HOURS: readonly WorkingShift[] = [
  1, 2, 3, 4, 5, 6, 7,
].map((weekday) => ({ weekday, start_time: '08:00', end_time: '20:00' }));

/**
 * Khoảng thời gian của một ngày theo giờ Việt Nam: [00:00, 24:00) +07:00, trả về ISO UTC.
 *
 * @param date Ngày `YYYY-MM-DD` theo giờ Việt Nam
 * @returns `{ from, to }` dạng ISO UTC
 */
export function vnDayInterval(date: string) {
  const from = Date.parse(`${date}T00:00:00.000Z`) - VN_OFFSET_MS;
  return interval(
    new Date(from).toISOString(),
    new Date(from + DAY_MS).toISOString(),
  );
}

/**
 * Ngày theo giờ Việt Nam của một thời điểm.
 *
 * @param iso Thời điểm ISO 8601
 * @returns Ngày `YYYY-MM-DD` theo giờ Việt Nam
 */
export function vnDate(iso: string) {
  return new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Thứ trong tuần của một ngày theo giờ Việt Nam.
 *
 * @param date Ngày `YYYY-MM-DD`
 * @returns 1 (thứ Hai) … 7 (Chủ nhật)
 */
export function vnWeekday(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Thời điểm ISO UTC của một giờ `HH:MM` trong ngày theo giờ Việt Nam.
 *
 * @param date Ngày `YYYY-MM-DD`
 * @param time Giờ `HH:MM`
 * @returns Thời điểm ISO UTC
 */
function vnTime(date: string, time: string) {
  return new Date(Date.parse(`${date}T${time}:00+07:00`)).toISOString();
}

/** Quy tắc giờ làm việc của thợ. Dùng chung cho calendar và booking. */
export class WorkSchedule {
  /**
   * Các ca làm của một ngày theo lịch tuần của thợ.
   * Chưa khai giờ nào ⇒ dùng mặc định 08:00–20:00; đã khai ⇒ thứ không có ca là ngày nghỉ.
   *
   * @param date Ngày `YYYY-MM-DD` theo giờ Việt Nam
   * @param schedule Lịch tuần thợ đã khai (có thể rỗng)
   * @returns Các khoảng `{ from, to }` ISO UTC, xếp theo giờ bắt đầu
   */
  static shifts(date: string, schedule: readonly WorkingShift[]) {
    const weekday = vnWeekday(date);
    return (schedule.length ? schedule : DEFAULT_WORKING_HOURS)
      .filter((shift) => shift.weekday === weekday)
      .map((shift) => ({
        from: vnTime(date, shift.start_time),
        to: vnTime(date, shift.end_time),
      }))
      .sort((x, y) => x.from.localeCompare(y.from));
  }

  /**
   * Khoảng thời gian có nằm trọn trong một ca làm của ngày đó không.
   *
   * @param range Khoảng `{ from, to }` ISO (ví dụ giờ của booking)
   * @param schedule Lịch tuần thợ đã khai (có thể rỗng)
   * @returns `true` nếu nằm trọn trong một ca
   */
  static fits(
    range: { from: string; to: string },
    schedule: readonly WorkingShift[],
  ) {
    const from = Date.parse(range.from),
      to = Date.parse(range.to);
    return WorkSchedule.shifts(vnDate(range.from), schedule).some(
      (shift) => from >= Date.parse(shift.from) && to <= Date.parse(shift.to),
    );
  }

  /**
   * Kiểm tra lịch tuần hợp lệ: thứ 1–7, giờ `HH:MM`, bắt đầu trước kết thúc, các ca cùng thứ không chồng nhau.
   *
   * @param schedule Lịch tuần cần lưu
   * @returns Không trả gì; ném `invalid` (400) nếu sai
   */
  static assertValid(schedule: readonly WorkingShift[]) {
    for (const shift of schedule) {
      ensure(
        Number.isInteger(shift.weekday) &&
          shift.weekday >= 1 &&
          shift.weekday <= 7,
        'weekday must be 1 (Monday) to 7 (Sunday)',
      );
      ensure(
        TIME.test(shift.start_time) && TIME.test(shift.end_time),
        'Times must use HH:MM',
      );
      ensure(
        shift.start_time < shift.end_time,
        'start_time must be before end_time',
      );
    }
    for (const shift of schedule)
      ensure(
        !schedule.some(
          (other) =>
            other !== shift &&
            other.weekday === shift.weekday &&
            other.start_time < shift.end_time &&
            shift.start_time < other.end_time,
        ),
        'Shifts on the same weekday must not overlap',
      );
  }
}
