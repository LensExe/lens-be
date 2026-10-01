import type { Gender } from '@shared/domain/values/user.values';

/**
 * Input for registering a new account in the backend after Keycloak authentication.
 * Used to initialize the user record, customer profile, and wallet.
 */
export interface IdentityCustomerRegisterCommandInput {
  /** User's full name. */
  fullname: string;
}

/**
 * Input for querying the current user's personal information (Me).
 * No input parameters are needed because authentication details come from the Actor (token).
 */
export type IdentityMeQueryInput = Record<string, never>;

/**
 * Input for updating the signed-in user's personal information.
 * All fields are optional.
 */
export interface IdentityUpdateMeCommandInput {
  /** New full name. */
  fullname?: string;
  /** Profile image URL. */
  avatar_url?: string;
  /** Contact phone number. */
  phone_number?: string;
  /** Gender. */
  gender?: Gender;
  /** Date of birth (ISO string or YYYY-MM-DD format). */
  dob?: string;
}

/**
 * Input for querying a user's public information by ID.
 */
export interface IdentityGetUserQueryInput {
  /** UUID of the user to retrieve. */
  id: string;
}

/**
 * Input for querying the user list (for admins).
 * Supports pagination, status filtering, and keyword search.
 */
export interface IdentityAdminUsersQueryInput {
  /** Maximum number of records to return per page (default: 20). */
  limit?: number;
  /** Starting record offset for pagination (default: 0). */
  offset?: number;
  /** Filter by account status: 'active' or 'suspended'. */
  status?: 'active' | 'suspended';
  /** Search keyword (matches name, email, etc.). */
  keyword?: string;
}

/**
 * Input for retrieving a user's full details by ID (for admins).
 */
export interface IdentityAdminUserQueryInput {
  /** UUID of the user whose details are requested. */
  id: string;
}

/**
 * Input for updating a user's status (for admins).
 */
export interface IdentityStatusCommandInput {
  /** UUID of the user whose status will change. */
  id: string;
  /** New status: 'active' or 'suspended'. */
  status: 'active' | 'suspended';
}

/**
 * Input for permanently banning a user account (for admins).
 */
export interface IdentityAdminBanCommandInput {
  /** UUID of the user to ban. */
  id: string;
}

/**
 * Input for suspending or locking a user account (for admins).
 */
export interface IdentitySuspendCommandInput {
  /** UUID of the user to suspend. */
  id: string;
}

/**
 * Input for unlocking or reactivating a user account (for admins).
 */
export interface IdentityUnsuspendCommandInput {
  /** UUID of the user to unlock. */
  id: string;
}

export interface IdentityAssignRoleCommandInput {
  id: string;
  role: string;
}

export interface IdentityRevokeRoleCommandInput {
  id: string;
  role: string;
}

export interface IdentityVerifyEmailCommandInput {
  id: string;
}

export interface IdentityForcePasswordResetCommandInput {
  id: string;
}

export interface IdentityLogoutCommandInput {
  id: string;
}
