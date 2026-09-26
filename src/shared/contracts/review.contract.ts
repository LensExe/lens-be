import type { ReviewStatus } from '@shared/database/entities/feedback.entity';

export interface ReviewCreateCommandInput {
  id: string;
  rating: number;
  punctuality_rating: number;
  attitude_rating: number;
  comment?: string;
}

export interface ReviewSummaryQueryInput {
  id: string;
}

export interface ReviewListQueryInput {
  id: string;
  limit?: number;
  offset?: number;
}

export interface ReviewUpdateCommandInput {
  id: string;
  rating?: number;
  punctuality_rating?: number;
  attitude_rating?: number;
  comment?: string;
}

export interface ReviewRemoveCommandInput {
  id: string;
}

export interface ReviewReplyCommandInput {
  id: string;
  reply: string;
}

export interface ReviewRestoreCommandInput {
  id: string;
}

export interface ReviewHideCommandInput {
  id: string;
  reason: string;
}

export interface ReviewAdminListQueryInput {
  limit?: number;
  offset?: number;
  status?: ReviewStatus;
  photographer_id?: string;
}
