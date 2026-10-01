import type { BookingStatus } from '@shared/domain/values/booking.values';

export interface BookingAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: BookingStatus;
}

export interface BookingCreateCommandInput {
  photographer_id: string;
  plan_id: string;
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
  id: string;
}

export interface BookingCancelCommandInput {
  id: string;
  reason: string;
}

export interface BookingAdminCancelCommandInput {
  id: string;
  reason: string;
}

export interface BookingCompleteCommandInput {
  id: string;
}

export interface BookingCollaboratorInviteCommandInput {
  id: string;
  photographer_id: string;
  share_percent: number;
}

export interface BookingCollaboratorListQueryInput {
  id: string;
}

/** Paginated list of invitations for the signed-in photographer. */
export interface BookingCollaboratorMeQueryInput {
  limit?: number;
  offset?: number;
}

export interface BookingCollaboratorAcceptCommandInput {
  id: string;
}

export interface BookingCollaboratorDeclineCommandInput {
  id: string;
}

export interface BookingCollaboratorRevokeCommandInput {
  id: string;
}

/** The job that cancels a booking without a deposit takes no arguments. */
export type BookingCancelUnpaidCommandInput = Record<string, never>;

/** The job that expires pending requests takes no arguments. */
export type BookingExpirePendingCommandInput = Record<string, never>;

/** The job that automatically completes bookings takes no arguments. */
export type BookingAutoCompleteCommandInput = Record<string, never>;

export interface BookingConfirmReceiptCommandInput {
  id: string;
}

export interface BookingCompleteShootCommandInput {
  id: string;
}

export interface BookingDisputeCommandInput {
  id: string;
  reason: string;
}

export interface BookingRejectCommandInput {
  id: string;
  reason: string;
}

export interface BookingStartCommandInput {
  id: string;
}

export interface BookingTimelineQueryInput {
  id: string;
}

export interface BookingGetQueryInput {
  id: string;
}
