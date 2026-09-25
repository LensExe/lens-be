/** Chặn lịch: gửi `date` (nguyên ngày giờ VN) hoặc cả `from` và `to`. */
export interface CalendarBlockCommandInput {
  date?: string;
  from?: string;
  to?: string;
  reason?: string;
}

/** Lọc lịch cá nhân: mục chồng lên [from, to); mốc nào không gửi thì không lọc phía đó. */
export interface CalendarMeQueryInput {
  from?: string;
  to?: string;
}

export type CalendarWorkingHoursQueryInput = Record<string, never>;

export interface CalendarSetWorkingHoursCommandInput {
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
