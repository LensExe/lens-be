import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import {
  KeycloakHttpService,
  KeycloakUpstreamException,
} from './keycloak-http.service';
import type { KeycloakUser } from './types/user';
import { NormalizeEmail } from './utils/normalize-email';

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
    const normalizedEmail = NormalizeEmail(email);
    const exactMatches = await this.searchUsersByEmail(normalizedEmail, true);
    const exactMatch = exactMatches.find(
      (user) => user.email && NormalizeEmail(user.email) === normalizedEmail,
    );
    if (exactMatch) return exactMatch;

    // Older accounts may have been stored with different email casing.
    const caseInsensitiveMatches = await this.searchUsersByEmail(
      normalizedEmail,
      false,
    );
    return (
      caseInsensitiveMatches.find(
        (user) => user.email && NormalizeEmail(user.email) === normalizedEmail,
      ) ?? null
    );
  }

  private searchUsersByEmail(
    email: string,
    exact: boolean,
  ): Promise<KeycloakUser[]> {
    return this.request(
      `/admin/realms/${this.realm()}/users?${new URLSearchParams({
        email,
        exact: String(exact),
      })}`,
    );
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

  // get service-account access token

  /**
   * Get a service-account access token from Keycloak to call its user management API.
   *
   * @returns Result of the operation described above.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  async getAdminAccessToken(): Promise<string> {
    // Prefer the dedicated admin service account when one is configured. The
    // normal OIDC client is kept as a local-development fallback because the
    // Keycloak setup script can grant it the same service-account roles.
    const clientId =
      this.config.get<string>('auth.keycloakAdminClientId')?.trim() ||
      this.config.get<string>('auth.keycloakClientId')?.trim();
    const clientSecret =
      this.config.get<string>('auth.keycloakAdminClientSecret')?.trim() ||
      this.config.get<string>('auth.keycloakClientSecret')?.trim();

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Keycloak admin service-account credentials are not configured',
      );
    }

    let response: KeycloakAdminTokenResponse;
    try {
      response = await this.fetchJson<KeycloakAdminTokenResponse>(
        `/realms/${this.realm()}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          data: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
          }),
        },
      );
    } catch (error) {
      if (
        error instanceof KeycloakUpstreamException &&
        [400, 401, 403].includes(error.upstreamStatus)
      ) {
        throw new ServiceUnavailableException(
          'Keycloak admin authentication is not configured correctly',
        );
      }
      throw error;
    }
    if (!response.access_token) {
      throw new ServiceUnavailableException(
        'Keycloak did not return an admin access token',
      );
    }
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
    try {
      return await this.request<{ id: string; name: string }>(
        `/admin/realms/${this.realm()}/roles/${encodeURIComponent(roleName)}`,
      );
    } catch (error) {
      // Keycloak role names are case-sensitive. Existing realms may contain
      // CUSTOMER/PHOTOGRAPHER while Lens uses lowercase role values, so fall
      // back to a case-insensitive lookup before reporting the role missing.
      if (
        !(error instanceof KeycloakUpstreamException) ||
        error.upstreamStatus !== 404
      ) {
        throw error;
      }

      const roles = await this.request<Array<{ id: string; name: string }>>(
        `/admin/realms/${this.realm()}/roles?first=0&max=1000`,
      );
      const normalized = roleName.trim().toLowerCase();
      const role = roles.find(
        (candidate) => candidate.name.trim().toLowerCase() === normalized,
      );
      if (!role) {
        throw new BadRequestException(
          `Keycloak realm role "${roleName}" was not found`,
        );
      }
      return role;
    }
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
    const token = await this.getAdminAccessToken();
    try {
      return await this.fetchJson<T>(path, {
        ...config,
        headers: {
          ...config.headers,
          authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      if (error instanceof KeycloakUpstreamException) {
        if ([401, 403].includes(error.upstreamStatus)) {
          throw new ServiceUnavailableException(
            'Keycloak admin access is not configured correctly',
          );
        }
        if (error.upstreamStatus === 400) {
          throw new BadRequestException('Keycloak rejected the request');
        }
      }
      throw error;
    }
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
