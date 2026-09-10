import {
  BadGatewayException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import { KeycloakHttpService } from './keycloak-http.service';
import { KeycloakJwksService } from './jwks.service';
import { KeycloakUserService } from './user.service';
import type { KeycloakUserSummary } from './types/user';
import type {
  KeycloakExchangeCodeForTokenParams,
  KeycloakExchangeCodeForTokenResponse,
  KeycloakPasswordLoginParams,
  KeycloakRefreshTokenParams,
  KeycloakRegisterUserParams,
  KeycloakTokenIntrospectResponse,
} from './types/tokens';

@Injectable()
/** Keycloak OpenID Connect and Admin REST API client. */
export class KeycloakTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: KeycloakHttpService,
    private readonly jwks: KeycloakJwksService,
    private readonly users: KeycloakUserService,
  ) {}

  exchangeCodeForToken(
    params: KeycloakExchangeCodeForTokenParams,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    return this.tokenRequest({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    });
  }

  async exchangePasswordForToken(
    params: KeycloakPasswordLoginParams,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    try {
      return await this.tokenRequest({
        grant_type: 'password',
        username: params.username,
        password: params.password,
        scope: 'openid profile email',
      });
    } catch (error) {
      if (
        error instanceof BadGatewayException &&
        error.getResponse() === 'Keycloak request failed with status 401'
      ) {
        throw new UnauthorizedException('Invalid username or password');
      }
      throw error;
    }
  }

  exchangeRefreshTokenForToken(
    params: KeycloakRefreshTokenParams,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });
  }

  async revokeRefreshToken(params: KeycloakRefreshTokenParams): Promise<void> {
    await this.formRequest<void>(
      `/realms/${this.realm()}/protocol/openid-connect/revoke`,
      {
        token: params.refreshToken,
        token_type_hint: 'refresh_token',
        ...this.clientCredentials(),
      },
    );
  }

  async registerUserWithPassword(
    params: KeycloakRegisterUserParams,
  ): Promise<string> {
    const adminToken = await this.users.getAdminToken();
    const response = await this.http.request<void>({
      url: `/admin/realms/${this.realm()}/users`,
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      data: {
        username: params.username,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        enabled: true,
        emailVerified: false,
        credentials: [
          { type: 'password', value: params.password, temporary: false },
        ],
      },
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 409,
    });
    if (response.status === 409)
      throw new ConflictException('Keycloak user already exists');

    const location = response.headers.location as string | undefined;
    if (location) return location.split('/').pop() ?? '';

    const query = new URLSearchParams({
      username: params.username,
      exact: 'true',
    });
    const users = await this.jsonRequest<KeycloakUserSummary[]>(
      `/admin/realms/${this.realm()}/users?${query}`,
      { headers: { authorization: `Bearer ${adminToken}` } },
    );
    if (!users[0]?.id)
      throw new BadGatewayException('Keycloak did not return the new user id');
    return users[0].id;
  }

  async sendVerifyEmail(userId: string): Promise<void> {
    const adminToken = await this.users.getAdminToken();
    await this.jsonRequest<void>(
      `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/execute-actions-email`,
      {
        method: 'PUT',
        headers: { authorization: `Bearer ${adminToken}` },
        data: ['VERIFY_EMAIL'],
      },
    );
  }

  verifyAccessToken(token: string): Promise<KeycloakTokenIntrospectResponse> {
    return this.jwks.verifyAccessToken(token);
  }

  verifyRefreshToken(token: string): Promise<KeycloakTokenIntrospectResponse> {
    return this.introspect(token, 'refresh_token');
  }

  verifyAccessTokenIntrospect(
    token: string,
  ): Promise<KeycloakTokenIntrospectResponse> {
    return this.introspect(token, 'access_token');
  }

  private tokenRequest(
    values: Record<string, string>,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    return this.formRequest(
      `/realms/${this.realm()}/protocol/openid-connect/token`,
      { ...values, ...this.clientCredentials() },
    );
  }

  private introspect(
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token',
  ): Promise<KeycloakTokenIntrospectResponse> {
    return this.formRequest(
      `/realms/${this.realm()}/protocol/openid-connect/token/introspect`,
      {
        token,
        token_type_hint: tokenTypeHint,
        ...this.clientCredentials(),
      },
    );
  }

  private formRequest<T>(
    path: string,
    values: Record<string, string>,
  ): Promise<T> {
    return this.jsonRequest(path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams(values),
    });
  }

  private async jsonRequest<T>(
    path: string,
    config: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.http.request<T>({
      url: path,
      ...config,
    });
    if (response.status === 204) return undefined as T;
    return response.data;
  }

  private clientCredentials(): Record<string, string> {
    const clientId = this.config.get<string>('auth.keycloakClientId');
    const clientSecret = this.config.get<string>('auth.keycloakSecret');
    if (!clientId || !clientSecret)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return { client_id: clientId, client_secret: clientSecret };
  }

  private realm(): string {
    const value = this.config.get<string>('auth.keycloakRealm');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return encodeURIComponent(value);
  }
}
