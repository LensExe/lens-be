import { createHash, randomBytes } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Actor } from '@shared/platform/auth/actor';
import { RedisService } from '@shared/database/redis/redis.service';
import {
  KeycloakIdentityProvider,
  KeycloakOidcRedirectService,
  KeycloakService,
  KeycloakTokenService,
  KeycloakUserService,
  type KeycloakExchangeCodeForTokenResponse,
} from '@shared/integrations/keycloak';
import type { RegistrationRole } from '@shared/domain/values/user.values';

export interface GoogleCallbackResult {
  tokenSet: KeycloakExchangeCodeForTokenResponse;
  actor: Actor;
}

export interface GoogleFrontendHandoff {
  tokenSet: KeycloakExchangeCodeForTokenResponse;
  user: unknown;
}

const GOOGLE_HANDOFF_TTL_SECONDS = 60;

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oidc: KeycloakOidcRedirectService,
    private readonly keycloak: KeycloakService,
    private readonly tokens: KeycloakTokenService,
    private readonly users: KeycloakUserService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Build a Google sign-in URL with a state value to protect the callback flow.
   *
   * @returns Result returned by `buildAuthorizeRedirectUrl`.
   */
  async buildLoginUrl(): Promise<string> {
    return this.oidc.buildAuthorizeRedirectUrl(
      KeycloakIdentityProvider.Google,
      this.redirectUri(),
    );
  }

  /**
   * Validate the sign-in callback and complete authentication with the provider.
   *
   * @param code Business or configuration code to process.
   * @param state State value used by the operation.
   * @returns Result object containing the fields `tokenSet`, `actor`.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<GoogleCallbackResult> {
    const pkce = await this.oidc.consumePkceBundle(
      KeycloakIdentityProvider.Google,
      state,
    );
    const tokenSet = await this.tokens.exchangeCodeForToken({
      code,
      redirectUri: pkce.redirectUri,
      codeVerifier: pkce.codeVerifier,
    });
    const claims = await this.keycloak.verifyToken(tokenSet.access_token);
    const actor: Actor = {
      sub: claims.sub,
      email: claims.email,
      name:
        claims.name ??
        claims.preferred_username ??
        claims.email?.split('@')[0] ??
        'Google user',
      roles: claims.roles ?? [],
    };
    return { tokenSet, actor };
  }

  /**
   * Make sure the Google session carries the Lens role resolved from the
   * local profile. A token issued before the first-login profile is created
   * does not contain that role, so refresh it after the Keycloak mapping is
   * updated.
   */
  async synchronizeRole(
    actor: Actor,
    tokenSet: KeycloakExchangeCodeForTokenResponse,
    role: RegistrationRole,
  ): Promise<KeycloakExchangeCodeForTokenResponse> {
    if (actor.roles.includes(role)) return tokenSet;

    await this.users.assignRealmRoleToUser(actor.sub, role);
    const refreshed = await this.tokens.exchangeRefreshTokenForToken({
      refreshToken: tokenSet.refresh_token,
    });
    const claims = await this.keycloak.verifyToken(refreshed.access_token);
    if (!claims.roles?.includes(role)) {
      throw new UnauthorizedException(
        `Keycloak did not issue the ${role} role for the Google account`,
      );
    }
    return refreshed;
  }

  async createFrontendHandoff(payload: GoogleFrontendHandoff): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.redis.setJson(
      this.handoffKey(code),
      payload,
      GOOGLE_HANDOFF_TTL_SECONDS,
    );
    return code;
  }

  async consumeFrontendHandoff(code: string): Promise<GoogleFrontendHandoff> {
    const raw = await this.redis.getAndDelete(this.handoffKey(code));
    if (!raw) throw new UnauthorizedException('Google login has expired');

    try {
      return JSON.parse(raw) as GoogleFrontendHandoff;
    } catch {
      throw new UnauthorizedException('Google login handoff is invalid');
    }
  }

  frontendRedirectUri(code: string): string {
    const redirectUri = this.config.get<string>(
      'auth.keycloakGoogleFrontendRedirectUri',
    );
    if (!redirectUri) {
      throw new ServiceUnavailableException(
        'Google frontend redirect URI is not configured',
      );
    }

    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    return url.toString();
  }

  /**
   * Build the callback URI used to complete the OAuth sign-in flow.
   *
   * @returns String result of the operation.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private redirectUri(): string {
    const redirectUri = this.config.get<string>(
      'auth.keycloakGoogleRedirectUri',
    );
    if (!redirectUri) {
      throw new ServiceUnavailableException(
        'Keycloak Google redirect URI is not configured',
      );
    }
    return redirectUri;
  }

  private handoffKey(code: string): string {
    const digest = createHash('sha256').update(code).digest('hex');
    return `keycloak:google-handoff:${digest}`;
  }
}
