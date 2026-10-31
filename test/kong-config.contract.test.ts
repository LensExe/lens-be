import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const configPath = '.docker/kong/kong.yml';

test('Kong declarative config covers every Core API route family', () => {
  const config = readFileSync(configPath, 'utf8');
  const tracker = JSON.parse(readFileSync('docs/api-tracker.json', 'utf8')) as {
    method: string;
    path: string;
    description?: string;
  }[];
  const routeFamilies = new Set(
    tracker
      .filter(
        (row) =>
          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(row.method) &&
          !row.description?.startsWith('Tạm vô hiệu hoá:'),
      )
      .map(
        (row) =>
          row.path
            .replace(/^\/api\/v1\//, '')
            .split('/')
            .filter(Boolean)[0],
      ),
  );

  for (const family of routeFamilies) {
    assert.match(
      config,
      new RegExp(`^\\s+- /api/v1/${family}\\s*$`, 'm'),
      `Missing Kong route family: ${family}`,
    );
  }

  for (const plugin of [
    'cors',
    'request-transformer',
    'request-size-limiting',
    'rate-limiting',
    'prometheus',
  ]) {
    assert.match(config, new RegExp(`name: ${plugin.replace('-', '\\-')}`));
  }

  assert.match(config, /X-Kong-Request-ID/);
  assert.doesNotMatch(config, /name:\s*correlation-id/);
  assert.match(config, /strip_path: false/);
  assert.doesNotMatch(config, /^\s+- \/\s*$/m);
});

test('Kong exposes Chat under the canonical public prefix', () => {
  const config = readFileSync(configPath, 'utf8');
  assert.match(config, /name: chat-api/);
  assert.match(config, /name: chat-api-v1[\s\S]*?\/api\/v1\/chat/);
  assert.match(config, /url: http:\/\/host\.docker\.internal:3002/);
});
