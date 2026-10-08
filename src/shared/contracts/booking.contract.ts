import type { BookingStatus } from '@shared/domain/values/booking.values';

export interface BookingAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: BookingStatus;
}

export interface BookingCreateCommandInput {
  photographer_id: string;
  booking_plan_id: string;
  location: string;
  from: string;
  to: string;
}

export interface BookingListQueryInput {
  limit?: number;
  offset?: number;
  status?: BookingStatus;
  from?: string;
  to?: string;
}

export interface BookingAcceptCommandInput {
  booking_id: string;
}

export interface BookingCancelCommandInput {
  booking_id: string;
  reason: string;
}

export interface BookingAdminCancelCommandInput {
  booking_id: string;
  reason: string;
}

export interface BookingCompleteCommandInput {
  booking_id: string;
}

/** The job that cancels a booking without a deposit takes no arguments. */
export type BookingCancelUnpaidCommandInput = Record<string, never>;

/** The job that expires pending requests takes no arguments. */
export type BookingExpirePendingCommandInput = Record<string, never>;

/** The job that automatically completes bookings takes no arguments. */
export type BookingAutoCompleteCommandInput = Record<string, never>;

export interface BookingConfirmReceiptCommandInput {
  booking_id: string;
}

export interface BookingCompleteShootCommandInput {
  booking_id: string;
}

export interface BookingDisputeCommandInput {
  booking_id: string;
  reason: string;
}

export interface BookingRejectCommandInput {
  booking_id: string;
  reason: string;
}

export interface BookingStartCommandInput {
  booking_id: string;
}

export interface BookingTimelineQueryInput {
  booking_id: string;
}

export interface BookingGetQueryInput {
  booking_id: string;
}
