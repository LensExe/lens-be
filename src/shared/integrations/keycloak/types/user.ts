/**
 * Represents a Keycloak user.
 */
export interface KeycloakUser {
  /**
   * The ID of the user.
   */
  id: string;
  /**
   * The username of the user.
   */
  username: string;
  /**
   * The email of the user.
   */
  email: string;
  /**
   * The first name of the user.
   */
  firstName: string;
  /**
   * The last name of the user.
   */
  lastName: string;
  /**
   * Whether the user is enabled.
   */
  enabled: boolean;
  /**
   * Whether the user's email is verified.
   */
  emailVerified: boolean;
  /**
   * The required actions of the user.
   */
  requiredActions: Array<string>;
}

/**
 * Minimal element of the Keycloak admin users-search response, from which we
 * only read the user id after creating a user.
 */
export interface KeycloakUserSummary {
  /**
   * The ID of the user.
   */
  id: string;
}
