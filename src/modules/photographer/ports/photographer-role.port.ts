/**
 * Ability to assign or remove the `photographer` role in Keycloak, as required by the photographer context when an admin approves an application.
 *
 * Provided by the API runtime through the Keycloak Admin API.
 * The user must refresh their token or sign in again to receive the new role in the token.
 */
export abstract class PhotographerRolePort {
  /**
   * Assign the `photographer` realm role to a user.
   *
   * @param keycloakUserId Keycloak user ID (`users.keycloak_id`).
   * @returns Promise that resolves when the role has been assigned.
   */
  abstract grant(keycloakUserId: string): Promise<void>;

  /**
   * Remove the `photographer` realm role from a user.
   *
   * @param keycloakUserId Keycloak user ID (`users.keycloak_id`).
   * @returns Promise that resolves when the role has been removed.
   */
  abstract revoke(keycloakUserId: string): Promise<void>;
}
