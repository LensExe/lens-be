export interface PhotographerLocationCommandInput {
  location: string;
}

export interface PhotographerStatusCommandInput {
  is_available: boolean;
}

export interface PhotographerAdminQueryInput {
  limit?: number;
  offset?: number;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export interface PhotographerApproveCommandInput {
  id: string;
}

export interface PhotographerRejectCommandInput {
  id: string;
  reason: string;
}

export interface PhotographerUpdateCommandInput {
  tax_code?: string;
  styles?: string[];
  started_career_at?: number;
  description?: string;
}

export type PhotographerMeQueryInput = Record<string, never>;

export interface PhotographerCreateCommandInput {
  tax_code?: string;
  styles: string[];
  started_career_at?: number;
  location: string;
  description?: string;
}

export interface PhotographerTopQueryInput {
  limit?: number;
  offset?: number;
}

export interface PhotographerSearchQueryInput {
  limit?: number;
  offset?: number;
  location?: string;
  keyword?: string;
  min_rating?: number;
}

export interface PhotographerGetQueryInput {
  id: string;
}
