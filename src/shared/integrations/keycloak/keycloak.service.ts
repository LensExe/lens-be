import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface KeycloakUser {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  roles?: string[];
  exp?: number;
  typ?: string;
  resource_access?: Record<string, { roles: string[] }>;
  realm_access?: {
    roles: string[];
  };
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private jwksClientInstance: jwksClient.JwksClient | null = null;
  private readonly authServerUrl?: string;
  private readonly realm?: string;
  private readonly audience?: string;

  constructor(private readonly configService: ConfigService) {
    const auth = this.configService.get('auth') ?? {};
    this.authServerUrl = auth.keycloakAuthServerUrl;
    this.realm = auth.keycloakRealm;
    // TODO: INSERT_KEYCLOAK_CLIENT_ID via KEYCLOAK_CLIENT_ID (API audience).
    this.audience = auth.keycloakClientId;

    if (this.authServerUrl && this.realm) {
      const jwksUri = `${this.authServerUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
      this.jwksClientInstance = jwksClient({
        jwksUri,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
      this.logger.log(
        `Initialized Keycloak JWKS client for realm: ${this.realm}`,
      );
    }
  }

  /**
   * Xác thực access token từ Keycloak
   */
  async verifyToken(token: string): Promise<KeycloakUser> {
    // TODO: INSERT_KEYCLOAK_REALM and INSERT_KEYCLOAK_AUTH_SERVER_URL in env.
    // Fail closed: never trust jwt.decode() as authentication.
    if (!this.jwksClientInstance || !this.audience)
      throw new UnauthorizedException('Keycloak is not configured');

    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        const keyId: unknown = header.kid;
        if (typeof keyId !== 'string' || !keyId) {
          return callback(new Error('Token header missing kid'));
        }
        this.jwksClientInstance!.getSigningKey(keyId, (err, key) => {
          if (err || !key) {
            return callback(
              err instanceof Error ? err : new Error('Signing key not found'),
            );
          }
          const signingKey = key.getPublicKey();
          callback(null, signingKey);
        });
      };

      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: `${this.authServerUrl}/realms/${this.realm}`,
          audience: this.audience,
        },
        (err, decoded) => {
          if (err || !decoded) {
            this.logger.warn(
              `Keycloak token verification failed: ${err instanceof Error ? err.message : 'invalid token'}`,
            );
            return reject(
              new UnauthorizedException('Token verification failed'),
            );
          }
          const user = decoded as KeycloakUser;
          if (!user.sub || !user.exp || user.typ !== 'Bearer')
            return reject(
              new UnauthorizedException(
                'A non-expired Keycloak access token is required',
              ),
            );
          user.roles = [
            ...new Set([
              ...(user.realm_access?.roles ?? []),
              ...(user.resource_access?.[this.audience!]?.roles ?? []),
            ]),
          ];
          resolve(user);
        },
      );
    });
  }
}
