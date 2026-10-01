import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import { KeycloakHttpService } from './keycloak-http.service';
import type { KeycloakUser } from './types/user';

interface KeycloakAdminTokenResponse {
  access_token: string;
}

@Injectable()
/** Keycloak Admin REST API client. */
export class KeycloakUserService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: KeycloakHttpService,
  ) {}

  /**
   * Find a Keycloak user by username.
   *
   * @param username String value used by the operation: username.
   * @returns Result of the operation described above.
   */
  async getUserByUsername(username: string): Promise<KeycloakUser | null> {
    const users = await this.request<KeycloakUser[]>(
      `/admin/realms/${this.realm()}/users?${new URLSearchParams({
        username,
        exact: 'true',
      })}`,
    );
    return users[0] ?? null;
  }

  /**
   * Find a Keycloak user by email address.
   *
   * @param email Email address associated with the operation.
   * @returns Result of the operation described above.
   */
  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    const users = await this.request<KeycloakUser[]>(
      `/admin/realms/${this.realm()}/users?${new URLSearchParams({
        email,
        exact: 'true',
      })}`,
    );
    return users[0] ?? null;
  }

  /**
   * Find a Keycloak user by ID.
   *
   * @param userId User ID associated with the operation.
   * @returns Result returned by `request`.
   */
  getUserById(userId: string): Promise<KeycloakUser> {
    return this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}`,
    );
  }

  // get admin access token

  /**
   * Get an admin access token from Keycloak to call its user management API.
   *
   * @returns Result of the operation described above.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  async getAdminToken(): Promise<string> {
    const username = this.config.get<string>('auth.keycloakAdminUsername');
    const password = this.config.get<string>('auth.keycloakAdminPassword');
    if (!username || !password) {
      throw new ServiceUnavailableException(
        'Keycloak admin credentials are not configured',
      );
    }

    const response = await this.fetchJson<KeycloakAdminTokenResponse>(
      `/realms/${this.realm()}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({
          grant_type: 'password',
          client_id:
            this.config.get<string>('auth.keycloakAdminClientId') ??
            'admin-cli',
          username,
          password,
        }),
      },
    );
    return response.access_token;
  }

  /**
   * Reset a user password in Keycloak.
   *
   * @param userId User ID associated with the operation.
   * @param password Password supplied for authentication.
   * @returns Result returned by `request`.
   */
  resetUserPassword(userId: string, password: string): Promise<void> {
    return this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/reset-password`,
      {
        method: 'PUT',
        data: {
          type: 'password',
          value: password,
          temporary: false,
        },
      },
    );
  }

  /**
   * Mark a user email as verified in Keycloak.
   *
   * @param userId User ID associated with the operation.
   * @returns No value is returned.
   */
  async setUserEmailVerified(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}`,
      {
        method: 'PUT',
        data: {
          ...user,
          emailVerified: true,
          requiredActions: (user.requiredActions ?? []).filter(
            (action) => action !== 'VERIFY_EMAIL',
          ),
        },
      },
    );
  }

  /**
   * Log a user out of their current Keycloak sessions.
   *
   * @param userId User ID associated with the operation.
   * @returns No value is returned.
   */
  async logoutUser(userId: string): Promise<void> {
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/logout`,
      { method: 'POST' },
    );
  }

  /**
   * Ask Keycloak to send an email for account actions.
   *
   * @param userId User ID associated with the operation.
   * @param actions List of actions to process.
   * @returns No value is returned.
   */
  async executeActionsEmail(userId: string, actions: string[]): Promise<void> {
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/execute-actions-email`,
      { method: 'PUT', data: actions },
    );
  }

  /**
   * Enable or disable a Keycloak user account.
   *
   * @param userId User ID associated with the operation.
   * @param enabled Flag indicating whether enabled should be processed.
   * @returns No value is returned.
   */
  async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    const user = await this.getUserById(userId);
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}`,
      {
        method: 'PUT',
        data: { ...user, enabled },
      },
    );
  }

  /**
   * Find a realm role in Keycloak by name.
   *
   * @param roleName Role name.
   * @returns Result returned by `request`.
   */
  async getRealmRole(roleName: string): Promise<{ id: string; name: string }> {
    return this.request<{ id: string; name: string }>(
      `/admin/realms/${this.realm()}/roles/${encodeURIComponent(roleName)}`,
    );
  }

  /**
   * Assign a realm role to a Keycloak user.
   *
   * @param userId User ID associated with the operation.
   * @param roleName Role name.
   * @returns No value is returned.
   */
  async assignRealmRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.getRealmRole(roleName);
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'POST',
        data: [role],
      },
    );
  }

  /**
   * Remove a realm role from a Keycloak user.
   *
   * @param userId User ID associated with the operation.
   * @param roleName Role name.
   * @returns No value is returned.
   */
  async removeRealmRoleFromUser(
    userId: string,
    roleName: string,
  ): Promise<void> {
    const role = await this.getRealmRole(roleName);
    await this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'DELETE',
        data: [role],
      },
    );
  }

  /**
   * Send an HTTP request to Keycloak using the current client and configuration.
   *
   * @param path String value used by the operation: path.
   * @param config Service configuration.
   * @returns Result returned by `fetchJson`.
   */
  private async request<T = void>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    const token = await this.getAdminToken();
    return this.fetchJson<T>(path, {
      ...config,
      headers: {
        ...config.headers,
        authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Send an HTTP request and parse the JSON response into the specified type.
   *
   * @param path String value used by the operation: path.
   * @param config Service configuration.
   * @returns Result of the operation described above.
   */
  private async fetchJson<T>(
    path: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.http.request<T>({ url: path, ...config });
    if (response.status === 204) return undefined as T;
    return response.data;
  }

  /**
   * Get the configured Keycloak realm name.
   *
   * @returns Result returned by `encodeURIComponent`.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private realm(): string {
    const value = this.config.get<string>('auth.keycloakRealm');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return encodeURIComponent(value);
  }
}
