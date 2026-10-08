import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

/**
 * Input for querying the current user's customer profile.
 * No input parameters are needed because authentication details come from the Actor (token).
 */
export type CustomerMeQueryInput = Record<string, never>;

/**
 * Input for updating the signed-in user's customer profile.
 * All fields are optional.
 */
export interface CustomerUpdateCommandInput {
  /** A short introduction or the customer's photography needs. */
  description?: string | null;
  /** Preferred photography styles (for example, portrait, wedding, event, etc.). */
  preferred_styles?: PhotographyStyle[];
  /** The customer's service area, location, or place of residence. */
  location?: string | null;
}

/**
 * Input for querying any customer's profile (for admins).
 */
export interface CustomerAdminGetQueryInput {
  /** UUID of the customer to retrieve. */
  customer_id: string;
}

/**
 * Input for querying the customer list (for admins).
 */
export interface CustomerAdminListQueryInput {
  /** Search by name or email. */
  keyword?: string;
  /** Filter by service area. */
  location?: string;
  limit?: number;
  offset?: number;
}

/**
 * Input for querying photographer recommendations for a customer.
 */
export interface CustomerRecommendQueryInput {
  limit?: number;
  offset?: number;
}

/**
 * Input for querying a customer's booking statistics (no filter is currently needed).
 */
export type CustomerMyBookingSummaryQueryInput = Record<string, never>;
