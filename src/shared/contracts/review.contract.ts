import type { ReviewStatus } from '@shared/domain/values/review.values';

export interface ReviewCreateCommandInput {
  booking_id: string;
  rating: number;
  punctuality_rating: number;
  attitude_rating: number;
  comment?: string;
}

export interface ReviewSummaryQueryInput {
  photographer_id: string;
}

export interface ReviewListQueryInput {
  photographer_id: string;
  limit?: number;
  offset?: number;
}

export interface ReviewUpdateCommandInput {
  feedback_id: string;
  rating?: number;
  punctuality_rating?: number;
  attitude_rating?: number;
  comment?: string;
}

export interface ReviewRemoveCommandInput {
  feedback_id: string;
}

export interface ReviewReplyCommandInput {
  feedback_id: string;
  reply: string;
}

export interface ReviewRestoreCommandInput {
  feedback_id: string;
}

export interface ReviewHideCommandInput {
  feedback_id: string;
  reason: string;
}

export interface ReviewAdminListQueryInput {
  limit?: number;
  offset?: number;
  status?: ReviewStatus;
  photographer_id?: string;
}
