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

  async getUserByUsername(username: string): Promise<KeycloakUser | null> {
    const users = await this.request<KeycloakUser[]>(
      `/admin/realms/${this.realm()}/users?${new URLSearchParams({
        username,
        exact: 'true',
      })}`,
    );
    return users[0] ?? null;
  }

  getUserById(userId: string): Promise<KeycloakUser> {
    return this.request(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}`,
    );
  }

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

  private async fetchJson<T>(
    path: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.http.request<T>({ url: path, ...config });
    if (response.status === 204) return undefined as T;
    return response.data;
  }

  private realm(): string {
    const value = this.config.get<string>('auth.keycloakRealm');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return encodeURIComponent(value);
  }
}
