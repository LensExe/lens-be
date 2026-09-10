/**
 * Decoded JWT header for Keycloak-issued access tokens.
 */
export interface KeycloakJwtHeader {
  alg: string;
  typ: string;
  kid: string;
}

/** A Keycloak realm/resource access claim entry: the role names granted at that scope. */
export interface KeycloakRoleClaim {
  roles?: Array<string>;
}

/**
 * Standard access-token claims from Keycloak (realm / client scopes may add more).
 */
export interface KeycloakJwtPayload {
  exp: number;
  iat: number;
  auth_time?: number;
  jti: string;
  iss: string;
  aud: string | Array<string>;
  sub: string;
  typ: string;
  azp?: string;
  sid?: string;
  acr?: string;
  scope?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: KeycloakRoleClaim;
  resource_access?: Record<string, KeycloakRoleClaim>;
  [key: string]: unknown;
}

/**
 * One JWK entry from Keycloak realm certs document.
 */
export interface KeycloakJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  x5c?: Array<string>;
}

/**
 * Body of `GET/POST .../protocol/openid-connect/certs`.
 */
export interface KeycloakJwksResponse {
  keys: Array<KeycloakJwk>;
}
