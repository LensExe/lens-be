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

  constructor(private readonly configService: ConfigService) {
    const auth = this.configService.get('auth') ?? {};
    this.authServerUrl = auth.keycloakAuthServerUrl;
    this.realm = auth.keycloakRealm;

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
    if (!this.jwksClientInstance) {
      // Fallback: nếu chưa cấu hình Keycloak Server URL, decode token
      const decoded = jwt.decode(token) as KeycloakUser;
      if (!decoded) {
        throw new UnauthorizedException('Invalid token format');
      }
      return decoded;
    }

    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        if (!header.kid) {
          return callback(new Error('Token header missing kid'));
        }
        this.jwksClientInstance!.getSigningKey(header.kid, (err, key) => {
          if (err || !key) {
            return callback(err || new Error('Signing key not found'));
          }
          const signingKey = key.getPublicKey();
          callback(null, signingKey);
        });
      };

      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err || !decoded) {
          this.logger.warn(
            `Keycloak token verification failed: ${err?.message}`,
          );
          return reject(new UnauthorizedException('Token verification failed'));
        }
        resolve(decoded as KeycloakUser);
      });
    });
  }
}
