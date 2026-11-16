import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import type { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from '../src/features/api/auth/google-auth.service';
import type { RedisService } from '../src/shared/database/redis/redis.service';
import type { KeycloakOidcRedirectService } from '../src/shared/integrations/keycloak';

test('Google Creator login stores a single-use client choice with OAuth state', async () => {
  const state = 'one-time-oauth-state';
  const entries = new Map<string, string>();
  const redis = {
    set: async (key: string, value: string) => entries.set(key, value),
    getAndDelete: async (key: string) => {
      const value = entries.get(key) ?? null;
      entries.delete(key);
      return value;
    },
  } as unknown as RedisService;
  const config = {
    get: (key: string) =>
      key === 'auth.keycloakGoogleRedirectUri'
        ? 'https://api.example.test/keycloak/google/callback'
        : 'https://portal.example.test/auth/google/callback',
  } as ConfigService;
  const oidc = {
    buildAuthorizeRedirectUrl: async () =>
      `https://identity.example.test/auth?state=${state}`,
  } as unknown as KeycloakOidcRedirectService;
  const service = new GoogleAuthService(
    config,
    oidc,
    {} as never,
    {} as never,
    redis,
    {} as never,
    {} as never,
  );

  const authorizationUrl = await service.buildLoginUrl('creator_mobile');
  const stateDigest = createHash('sha256').update(state).digest('hex');
  const clientKey = `keycloak:google-client:${stateDigest}`;
  assert.equal(authorizationUrl.includes(`state=${state}`), true);
  assert.equal(entries.get(clientKey), 'creator_mobile');
  assert.equal(await service.consumeLoginClient(state), 'creator_mobile');
  assert.equal(await service.consumeLoginClient(state), 'web');
  assert.equal(
    service.frontendRedirectUri('handoff-code', 'creator_mobile'),
    'lenscreator://auth/callback?code=handoff-code',
  );
  assert.equal(
    service.frontendRedirectUri('handoff-code'),
    'https://portal.example.test/auth/google/callback?code=handoff-code',
  );
});
