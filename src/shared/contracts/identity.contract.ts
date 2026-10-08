import type {
  Gender,
  RegistrationRole,
} from '@shared/domain/values/user.values';

/**
 * Input for registering a new account in the backend after Keycloak authentication.
 * The selected role determines which customer or photographer profile is initialized.
 */
export interface IdentityRegisterCommandInput {
  /** User's full name. */
  fullname: string;
  /** Profile type selected during registration; defaults to customer for OAuth callers. */
  role?: RegistrationRole;
}

/** Backward-compatible alias for callers that still use the original command name. */
export type IdentityCustomerRegisterCommandInput = IdentityRegisterCommandInput;

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
  user_id: string;
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
  user_id: string;
}

/**
 * Input for updating a user's status (for admins).
 */
export interface IdentityStatusCommandInput {
  /** UUID of the user whose status will change. */
  user_id: string;
  /** New status: 'active' or 'suspended'. */
  status: 'active' | 'suspended';
}

/**
 * Input for permanently banning a user account (for admins).
 */
export interface IdentityAdminBanCommandInput {
  /** UUID of the user to ban. */
  user_id: string;
}

/**
 * Input for suspending or locking a user account (for admins).
 */
export interface IdentitySuspendCommandInput {
  /** UUID of the user to suspend. */
  user_id: string;
}

/**
 * Input for unlocking or reactivating a user account (for admins).
 */
export interface IdentityUnsuspendCommandInput {
  /** UUID of the user to unlock. */
  user_id: string;
}

export interface IdentityAssignRoleCommandInput {
  user_id: string;
  role: string;
}

export interface IdentityRevokeRoleCommandInput {
  user_id: string;
  role: string;
}

export interface IdentityVerifyEmailCommandInput {
  user_id: string;
}

export interface IdentityForcePasswordResetCommandInput {
  user_id: string;
}

export interface IdentityLogoutCommandInput {
  user_id: string;
}
