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

  /**
   * Build the OIDC sign-in redirect URL and store the PKCE data associated with the state.
   *
   * @param provider Selected service provider.
   * @param redirectUri String value used by the operation: redirect uri.
   * @returns Result returned by `toString`.
   */
  async buildAuthorizeRedirectUrl(
    provider: KeycloakIdentityProvider,
    redirectUri: string,
  ): Promise<string> {
    //PKCE (Proof Key for Code Exchange) is a security measure that prevents authorization code interception attacks.
    //code_verifier: A randomly generated secret string (32–128 characters) by the client.
    const codeVerifier = this.base64Url(randomBytes(32));
    //code_challenge: The SHA256 hash of the code_verifier, Base64URL encoded.
    const codeChallenge = this.base64Url(
      createHash('sha256').update(codeVerifier).digest(),
    );
    //state: A random string used to prevent CSRF attacks and link the request to the response.
    const state = this.base64Url(randomBytes(32));
    await this.redis.setJson<KeycloakOidcPkceBundle>(
      this.stateKey(state),
      { provider, codeVerifier, redirectUri },
      STATE_TTL_SECONDS,
    );

    const url = new URL(
      `${this.baseKeyCloakUrl()}/realms/${this.realm()}/protocol/openid-connect/auth`,
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

  /**
   * Read and remove the PKCE data stored for an OIDC state value.
   *
   * @param provider Selected service provider.
   * @param state State value used by the operation.
   * @returns Result object containing the fields `codeVerifier`, `redirectUri`.
   * @throws {UnauthorizedException} Thrown when the credentials are invalid or have expired.
   */
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

  // hash redis key

  /**
   * Build the storage key for an OIDC state value.
   *
   * @param state State value used by the operation.
   * @returns Result of the operation described above.
   */
  private stateKey(state: string): string {
    const digest = createHash('sha256').update(state).digest('hex');
    return `keycloak:oidc-state:${digest}`;
  }

  // convert buffer to base64Url

  /**
   * Encode data as a URL-safe Base64 string.
   *
   * @param value value data of type Buffer.
   * @returns Result returned by `toString`.
   */
  private base64Url(value: Buffer): string {
    return value.toString('base64url');
  }

  // get base url

  /**
   * Get the Keycloak server base URL from configuration.
   *
   * @returns Result returned by `replace`.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private baseKeyCloakUrl(): string {
    const value = this.config.get<string>('auth.keycloakAuthServerUrl');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return value.replace(/\/$/, '');
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

  // get client id

  /**
   * Get the configured Keycloak client ID.
   *
   * @returns String result of the operation.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private clientId(): string {
    const value = this.config.get<string>('auth.keycloakClientId');
    if (!value)
      throw new ServiceUnavailableException('Keycloak is not configured');
    return value;
  }
}
