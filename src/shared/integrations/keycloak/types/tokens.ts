import type { KeycloakJwtPayload } from './jwt-jwks';

/**
 * Request body for exchanging username/password for a token.
 */
export interface KeycloakPasswordLoginParams {
  username: string;
  password: string;
}

/**
 * Params for a Keycloak refresh-token operation (refresh-token grant exchange, revocation).
 */
export interface KeycloakRefreshTokenParams {
  refreshToken: string;
}

/**
 * Parameters for creating a Keycloak user with password credentials.
 */
export interface KeycloakRegisterUserParams {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}
/**
 * Request body for exchanging a code for a token.
 */
export interface KeycloakExchangeCodeForTokenParams {
  /**
   * The code parameter received from the Google OAuth2 authorization flow.
   */
  code: string;

  /**
   * Redirect URI (must match the one used in the authorize request exactly).
   */
  redirectUri: string;

  /**
   * Code verifier used for the code exchange.
   */
  codeVerifier: string;
}

/** Supported identity providers for Keycloak broker callback flows. */
export enum KeycloakIdentityProvider {
  Google = 'google',
}

/**
 * Response from Keycloak for exchanging a code for a token.
 */
export interface KeycloakExchangeCodeForTokenResponse {
  /**
   * The access token.
   */
  access_token: string;
  /**
   * The expiration time of the access token.
   */
  expires_in: number;
  /**
   * The refresh token.
   */
  refresh_token: string;
  /**
   * The scope of the access token.
   */
  scope: string;
  /**
   * The type of the token.
   */
  token_type: string;
  /**
   * The session state of the token.
   */
  session_state?: string;
  /**
   * Optional ID token (present when openid scope is included).
   */
  id_token?: string;
}

export type { KeycloakJwtPayload } from './jwt-jwks';

/**
 * Response payload from Keycloak token introspection endpoint.
 */
export interface KeycloakTokenIntrospectResponse extends Partial<KeycloakJwtPayload> {
  /**
   * Whether token is active.
   */
  active: boolean;
  /**
   * Client id that issued/owns the token.
   */
  client_id?: string;
  /**
   * Username associated with the token.
   */
  username?: string;
  /**
   * Token type (typically "Bearer").
   */
  token_type?: string;
  /**
   * Avatar of the user.
   */
  avatar?: string;
}

export interface KeycloakOidcPkceBundle {
  provider: KeycloakIdentityProvider;
  codeVerifier: string;
  redirectUri: string;
}
