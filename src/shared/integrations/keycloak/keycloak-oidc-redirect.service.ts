import { createHash, randomBytes } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis/redis.service';
import {
  KeycloakIdentityProvider,
  type KeycloakOidcPkceBundle,
} from './types/tokens';

const STATE_TTL_SECONDS = 10 * 60;

@Injectable()
/** Creates REST redirect URLs and stores one-time PKCE state in Redis. */
export class KeycloakOidcRedirectService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async buildAuthorizeRedirectUrl(
    provider: KeycloakIdentityProvider,
    redirectUri: string,
  ): Promise<string> {
    const codeVerifier = this.base64Url(randomBytes(32));
    const codeChallenge = this.base64Url(
      createHash('sha256').update(codeVerifier).digest(),
    );
    const state = this.base64Url(randomBytes(32));
    await this.redis.setJson<KeycloakOidcPkceBundle>(
      this.stateKey(state),
      { provider, codeVerifier, redirectUri },
      STATE_TTL_SECONDS,
    );

    const url = new URL(
      `${this.baseUrl()}/realms/${this.realm()}/protocol/openid-connect/auth`,
    );
    url.search = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      kc_idp_hint: provider,
    }).toString();
    return url.toString();
  }

  async consumePkceBundle(
    provider: KeycloakIdentityProvider,
    state: string,
  ): Promise<Omit<KeycloakOidcPkceBundle, 'provider'>> {
    const key = this.stateKey(state);
    const cached = await this.redis.getJson<KeycloakOidcPkceBundle>(key);
    await this.redis.del(key);
    if (!cached || cached.provider !== provider)
      throw new UnauthorizedException('OIDC state is invalid or expired');
    return {
      codeVerifier: cached.codeVerifier,
      redirectUri: cached.redirectUri,
    };
  }

  private stateKey(state: string): string {
    const digest = createHash('sha256').update(state).digest('hex');
    return `keycloak:oidc-state:${digest}`;
  }

  private base64Url(value: Buffer): string {
    return value.toString('base64url');
  }

  private baseUrl(): string {
    const value = this.config.get<string>('auth.keycloakAuthServerUrl');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return value.replace(/\/$/, '');
  }

  private realm(): string {
    const value = this.config.get<string>('auth.keycloakRealm');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return encodeURIComponent(value);
  }

  private clientId(): string {
    const value = this.config.get<string>('auth.keycloakClientId');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return value;
  }
}
