export interface CalendarBlockCommandInput {
  date: string;
  reason?: string;
}

export type CalendarMeQueryInput = Record<string, never>;

export interface CalendarUnblockCommandInput {
  id: string;
}

export interface CalendarAvailabilityQueryInput {
  id: string;
  from?: string;
  to?: string;
}
