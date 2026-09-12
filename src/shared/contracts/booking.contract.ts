export interface BookingAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
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
  status?: string;
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

export interface BookingCompleteCommandInput {
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
