/** Chặn lịch: gửi `date` (nguyên ngày giờ VN) hoặc cả `from` và `to`. */
export interface CalendarBlockCommandInput {
  date?: string;
  from?: string;
  to?: string;
  reason?: string;
  /** Đồng ý từ chối các yêu cầu đang chờ chồng giờ; không gửi mà có yêu cầu bị ảnh hưởng ⇒ 409 */
  decline_pending?: boolean;
}

/** Xem trước yêu cầu đang chờ bị ảnh hưởng nếu chặn: cùng cách gửi khoảng như khi chặn. */
export interface CalendarBlockPreviewQueryInput {
  date?: string;
  from?: string;
  to?: string;
}

/** Lọc lịch cá nhân: mục chồng lên [from, to); mốc nào không gửi thì không lọc phía đó. */
export interface CalendarMeQueryInput {
  from?: string;
  to?: string;
}

export type CalendarWorkingHoursQueryInput = Record<string, never>;

export interface CalendarSetWorkingHoursCommandInput {
  items: { weekday: number; start_time: string; end_time: string }[];
  /** Đồng ý từ chối các yêu cầu đang chờ nằm ngoài giờ làm mới; không gửi mà có ⇒ 409 */
  decline_pending?: boolean;
}

/** Xem trước yêu cầu đang chờ nằm ngoài lịch tuần mới. */
export interface CalendarWorkingHoursPreviewQueryInput {
  items: { weekday: number; start_time: string; end_time: string }[];
}

export interface CalendarUnblockCommandInput {
  id: string;
}

export interface CalendarAvailabilityQueryInput {
  id: string;
  from?: string;
  to?: string;
}
