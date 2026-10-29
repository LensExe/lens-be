import { Injectable } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';
import type { KeycloakTokenIntrospectResponse } from './types/tokens';

/** Provides an introspection-shaped result while verifying JWTs locally via JWKS. */
@Injectable()
export class KeycloakJwksService {
  constructor(private readonly keycloak: KeycloakService) {}

  /**
   * Validate the Keycloak access token signature, issuer, and expiration.
   *
   * @param token Token to validate, exchange, or revoke.
   * @returns Result object containing the fields `active`, `username`, `token_type`.
   */
  async verifyAccessToken(
    token: string,
  ): Promise<KeycloakTokenIntrospectResponse> {
    try {
      const claims = await this.keycloak.verifyToken(token);
      return {
        ...claims,
        active: true,
        username: claims.preferred_username,
        token_type: claims.typ,
      };
    } catch {
      return { active: false };
    }
  }
}
