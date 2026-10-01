/** Block calendar time by providing `date` (a full day in Vietnam time) or both `from` and `to`. */
export interface CalendarBlockCommandInput {
  date?: string;
  from?: string;
  to?: string;
  reason?: string;
  /** Confirm or reject pending requests that overlap the blocked period; if affected requests exist and none are specified, return 409. */
  decline_pending?: boolean;
}

/** Preview pending requests that would be affected by blocking time; provide the range in the same way as for blocking. */
export interface CalendarBlockPreviewQueryInput {
  date?: string;
  from?: string;
  to?: string;
}

/** Filter the personal calendar to items overlapping [from, to); omit either boundary to leave that side unfiltered. */
export interface CalendarMeQueryInput {
  from?: string;
  to?: string;
}

export type CalendarWorkingHoursQueryInput = Record<string, never>;

export interface CalendarSetWorkingHoursCommandInput {
  items: { weekday: number; start_time: string; end_time: string }[];
  /** Confirm or reject pending requests outside the new working hours; if any are affected and none are specified, return 409. */
  decline_pending?: boolean;
}

/** Preview pending requests that fall outside the new weekly schedule. */
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
