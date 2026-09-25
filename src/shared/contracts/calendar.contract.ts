/** Chặn lịch: gửi `date` (nguyên ngày giờ VN) hoặc cả `from` và `to`. */
export interface CalendarBlockCommandInput {
  date?: string;
  from?: string;
  to?: string;
  reason?: string;
}

export type CalendarMeQueryInput = Record<string, never>;

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
