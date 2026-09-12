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
  actor: Actor;
  fullname: string;
  tokenSet: KeycloakExchangeCodeForTokenResponse;
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly oidc: KeycloakOidcRedirectService,
    private readonly keycloak: KeycloakService,
    private readonly tokens: KeycloakTokenService,
  ) {}

  async buildLoginUrl(): Promise<string> {
    return this.oidc.buildAuthorizeRedirectUrl(
      KeycloakIdentityProvider.Google,
      this.redirectUri(),
    );
  }

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
    return {
      tokenSet,
      fullname:
        claims.name ??
        claims.preferred_username ??
        claims.email?.split('@')[0] ??
        'Google user',
      actor: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        roles: claims.roles ?? [],
      },
    };
  }

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
