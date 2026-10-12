import { createPublicKey } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(projectRoot, '.docker/kong/kong.yml');
const outputPath = resolve(projectRoot, '.docker/kong/kong.generated.yml');
const insertionPoint = '# KONG_JWKS_CONSUMER_INSERTION_POINT';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}; load the environment containing Keycloak settings.`);
  }
  return value;
}

function toPem(jwk) {
  return createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: 'jwk',
  })
    .export({ type: 'spki', format: 'pem' })
    .toString()
    .trimEnd();
}

function toConsumerYaml(keys) {
  const entries = keys.map((jwk) => {
    const pemBlock = toPem(jwk)
      .split('\n')
      .map((line) => `          ${line}`)
      .join('\n');

    return [
      `      - key: ${JSON.stringify(jwk.kid)}`,
      '        algorithm: RS256',
      '        secret: kong-does-not-use-this-for-rs256',
      '        rsa_public_key: |',
      pemBlock,
    ].join('\n');
  });

  return [
    'consumers:',
    '  - username: keycloak',
    '    jwt_secrets:',
    ...entries,
  ].join('\n');
}

async function fetchSigningKeys(jwksUrl) {
  let lastError;

  // Keycloak may still be starting when the gateway command is run. Retry for
  // up to 30 seconds, but fail closed if the realm's JWKS remains unavailable.
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(jwksUrl, { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 404) {
          lastError = new Error(
            'Keycloak realm was not found; seed the realm before rendering Kong config.',
          );
          break;
        }
        throw new Error(`Keycloak JWKS returned HTTP ${response.status}`);
      }

      const jwks = await response.json();
      const keys = Array.isArray(jwks.keys)
        ? jwks.keys.filter(
            (key) =>
              key.kty === 'RSA' &&
              key.kid &&
              key.n &&
              key.e &&
              (!key.use || key.use === 'sig') &&
              (!key.alg || key.alg === 'RS256'),
          )
        : [];
      const uniqueKeys = [...new Map(keys.map((key) => [key.kid, key])).values()];

      if (uniqueKeys.length > 0) return uniqueKeys;
      throw new Error('Keycloak JWKS has no usable RS256 signing keys');
    } catch (error) {
      lastError = error;
      if (attempt < 14) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `Could not load RS256 signing keys from Keycloak. Check KEYCLOAK_AUTH_SERVER_URL, KEYCLOAK_REALM, and that the realm is initialized. ${lastError instanceof Error ? lastError.message : ''}`,
  );
}

async function main() {
  const authServerUrl = requiredEnv('KEYCLOAK_AUTH_SERVER_URL').replace(/\/+$/, '');
  const realm = requiredEnv('KEYCLOAK_REALM');
  const issuerUrl = `${authServerUrl}/realms/${encodeURIComponent(realm)}`;
  const jwksUrl = `${issuerUrl}/protocol/openid-connect/certs`;
  const template = readFileSync(templatePath, 'utf8');

  if (template.split(insertionPoint).length !== 2) {
    throw new Error(`Expected exactly one JWKS insertion point in ${templatePath}`);
  }

  const keys = await fetchSigningKeys(jwksUrl);
  const rendered = template.replace(insertionPoint, toConsumerYaml(keys));

  writeFileSync(outputPath, rendered, { mode: 0o600 });
  chmodSync(outputPath, 0o600);
  process.stdout.write(
    `Generated Kong declarative config with ${keys.length} Keycloak RS256 signing key(s).\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
