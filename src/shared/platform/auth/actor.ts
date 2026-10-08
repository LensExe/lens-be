/**
 * Represents the subject (user or system) making the request,
 * extracted directly from the Keycloak JWT access-token payload.
 */
export interface Actor {
  /**
   * Subject identifier (Keycloak user ID in UUID format).
   * Used as the `keycloak_id` foreign key linking the Keycloak account to its backend database record.
   */
  sub: string;

  /**
   * User email verified by Keycloak.
   * Used to set the email during account registration or send notifications. It may be absent if the token lacks the email scope.
   */
  email?: string;

  /**
   * Display name (`preferred_username` or full name) from the Keycloak profile.
   */
  name?: string;

  /**
   * Roles assigned to the user in the Keycloak realm or client (for example, `['admin', 'customer', 'photographer']`).
   * Used for role-based access control (RBAC) through checks such as `role(actor, 'admin')` or a guard.
   */
  roles: string[];
}
