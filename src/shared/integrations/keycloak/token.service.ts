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
import { DeriveUsername } from './utils/derive-username';

@Injectable()
/** Keycloak OpenID Connect and Admin REST API client. */
export class KeycloakTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: KeycloakHttpService,
    private readonly jwks: KeycloakJwksService,
    private readonly users: KeycloakUserService,
  ) {}

  // login with OIDC (Google)

  /**
   * Exchange an authorization code for a Keycloak token using the OIDC flow.
   *
   * @param params params data of type KeycloakExchangeCodeForTokenParams.
   * @returns Result returned by `tokenRequest`.
   */
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

  // login with username/password

  /**
   * Exchange an email and password for a Keycloak token.
   *
   * @param params params data of type KeycloakPasswordLoginParams.
   * @returns Result returned by `tokenRequest`.
   * @throws {UnauthorizedException} Thrown when the credentials are invalid or have expired.
   * @throws {Error} Thrown when the operation cannot be completed.
   */
  async exchangePasswordForToken(
    params: KeycloakPasswordLoginParams,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    try {
      return await this.tokenRequest({
        grant_type: 'password',
        email: params.email,
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

  // refresh token

  /**
   * Exchange a refresh token for a new Keycloak token set.
   *
   * @param params params data of type KeycloakRefreshTokenParams.
   * @returns Result returned by `tokenRequest`.
   */
  exchangeRefreshTokenForToken(
    params: KeycloakRefreshTokenParams,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });
  }

  // Revoke the refresh token.

  /**
   * Revoke the refresh token.
   *
   * @param params params data of type KeycloakRefreshTokenParams.
   * @returns No value is returned.
   */
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

  // register user

  /**
   * Register a user.
   *
   * @param params params data of type KeycloakRegisterUserParams.
   * @returns Result of the operation described above.
   * @throws {ConflictException} Thrown when the current state does not allow this operation.
   * @throws {BadGatewayException} Thrown when the operation cannot be completed.
   */
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
        username: DeriveUsername(params.email),
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        enabled: true,
        emailVerified: false,
        credentials: [
          {
            type: 'password',
            value: params.password,
            temporary: false,
          },
        ],
      },
      // notify axios that 409 is not an error
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 409,
    });

    // if 409, throw conflict exception
    if (response.status === 409)
      throw new ConflictException('Keycloak user already exists');

    // get user id from location header
    const location = response.headers.location as string | undefined;
    if (location) return location.split('/').pop() ?? '';

    // get user id from query
    const query = new URLSearchParams({
      username: DeriveUsername(params.email),
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

  // send verify email
  // async sendVerifyEmail(userId: string): Promise<void> {
  //   const adminToken = await this.users.getAdminToken();
  //   await this.jsonRequest<void>(
  //     `/admin/realms/${this.realm()}/users/${encodeURIComponent(userId)}/execute-actions-email`,
  //     {
  //       method: 'PUT',
  //       headers: { authorization: `Bearer ${adminToken}` },
  //       data: ['VERIFY_EMAIL'],
  //     },
  //   );
  // }

  // verify access-token by jwks (local)

  /**
   * Validate the Keycloak access token signature, issuer, and expiration.
   *
   * @param token Token to validate, exchange, or revoke.
   * @returns Result returned by `verifyAccessToken`.
   */
  verifyAccessToken(token: string): Promise<KeycloakTokenIntrospectResponse> {
    return this.jwks.verifyAccessToken(token);
  }

  // verify fresh-token by keycloak server

  /**
   * Validate a refresh token by checking it with Keycloak.
   *
   * @param token Token to validate, exchange, or revoke.
   * @returns Result returned by `introspect`.
   */
  verifyRefreshToken(token: string): Promise<KeycloakTokenIntrospectResponse> {
    return this.introspect(token, 'refresh_token');
  }

  // verify access-token by keycloak server

  /**
   * Check the access token status through the Keycloak introspection endpoint.
   *
   * @param token Token to validate, exchange, or revoke.
   * @returns Result returned by `introspect`.
   */
  verifyAccessTokenIntrospect(
    token: string,
  ): Promise<KeycloakTokenIntrospectResponse> {
    return this.introspect(token, 'access_token');
  }

  /**
   * Send a request to the Keycloak token endpoint and normalize the result.
   *
   * @param values values data of type Record<string, string>.
   * @returns Result returned by `formRequest`.
   */
  private tokenRequest(
    values: Record<string, string>,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    return this.formRequest(
      `/realms/${this.realm()}/protocol/openid-connect/token`,
      { ...values, ...this.clientCredentials() },
    );
  }

  /**
   * Send a token to the introspection endpoint and return its active status.
   *
   * @param token Token to validate, exchange, or revoke.
   * @param tokenTypeHint Token type hint.
   * @returns Result returned by `formRequest`.
   */
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

  // send request with form-urlencoded

  /**
   * Send a form-encoded HTTP request to Keycloak.
   *
   * @param path String value used by the operation: path.
   * @param values values data of type Record<string, string>.
   * @returns Result returned by `jsonRequest`.
   */
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

  // send request with json

  /**
   * Send a JSON HTTP request to Keycloak.
   *
   * @param path String value used by the operation: path.
   * @param config Service configuration.
   * @returns Result of the operation described above.
   */
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

  // get client credentials

  /**
   * Get a service access token using the Keycloak client credentials flow.
   *
   * @returns Result object containing the fields `client_id`, `client_secret`.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private clientCredentials(): Record<string, string> {
    const clientId = this.config.get<string>('auth.keycloakClientId');
    const clientSecret = this.config.get<string>('auth.keycloakSecret');
    if (!clientId || !clientSecret)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return { client_id: clientId, client_secret: clientSecret };
  }

  // get realm

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
