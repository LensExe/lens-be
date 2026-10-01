import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Actor } from '@shared/platform/auth/actor';
import {
  KeycloakIdentityProvider,
  KeycloakOidcRedirectService,
  KeycloakService,
  KeycloakTokenService,
  type KeycloakExchangeCodeForTokenResponse,
} from '@shared/integrations/keycloak';

export interface GoogleCallbackResult {
  tokenSet: KeycloakExchangeCodeForTokenResponse;
  actor: Actor;
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oidc: KeycloakOidcRedirectService,
    private readonly keycloak: KeycloakService,
    private readonly tokens: KeycloakTokenService,
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
}
