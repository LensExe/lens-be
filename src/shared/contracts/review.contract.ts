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
