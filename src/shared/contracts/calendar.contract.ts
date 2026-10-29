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

export interface CalendarUnblockCommandInput {
  offline_slot_id: string;
}

export interface CalendarAvailabilityQueryInput {
  photographer_id: string;
  from?: string;
  to?: string;
}

/** Public future offline slots for one photographer; defaults to the next 30 days. */
export interface CalendarOfflineSlotsQueryInput {
  photographer_id: string;
  from?: string;
  to?: string;
}
