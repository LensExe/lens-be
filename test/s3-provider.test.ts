import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { S3Client } from '@aws-sdk/client-s3';
import { getActiveS3Provider } from '../src/shared/integrations/s3/constants/s3';
import { S3Provider } from '../src/shared/integrations/s3/enums/s3';
import { S3ObjectService } from '../src/shared/integrations/s3/s3-object.service';
import { S3ObjectStorage } from '../src/shared/integrations/s3/s3-storage.service';
import { S3ClientResolverService } from '../src/shared/integrations/s3/s3-client-resolver.service';
import {
  getS3ProviderConfig,
  requireS3ProviderConfig,
} from '../src/shared/integrations/s3/s3.config';

const storageEnvKeys = [
  'S3_PROVIDER',
  'S3_MINIO_ENDPOINT',
  'S3_MINIO_PUBLIC_ENDPOINT',
  'S3_MINIO_REGION',
  'S3_MINIO_ACCESS_KEY_ID',
  'S3_MINIO_SECRET_ACCESS_KEY',
  'S3_MINIO_BUCKET',
  'S3_DIGITALOCEAN_ENDPOINT',
  'S3_DIGITALOCEAN_PUBLIC_ENDPOINT',
  'S3_DIGITALOCEAN_CDN_ENDPOINT',
  'S3_DIGITALOCEAN_REGION',
  'S3_DIGITALOCEAN_ACCESS_KEY_ID',
  'S3_DIGITALOCEAN_SECRET_ACCESS_KEY',
  'S3_DIGITALOCEAN_BUCKET',
];

async function withStorageEnv<T>(
  values: Record<string, string>,
  run: () => T | Promise<T>,
): Promise<T> {
  const previous = Object.fromEntries(
    storageEnvKeys.map((key) => [key, process.env[key]]),
  );
  for (const key of storageEnvKeys) delete process.env[key];
  Object.assign(process.env, values);

  try {
    return await run();
  } finally {
    for (const key of storageEnvKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const spacesEnv = {
  S3_PROVIDER: 'digitalocean',
  S3_DIGITALOCEAN_REGION: 'sgp1',
  S3_DIGITALOCEAN_ACCESS_KEY_ID: 'test-access-key',
  S3_DIGITALOCEAN_SECRET_ACCESS_KEY: 'test-secret-key',
  S3_DIGITALOCEAN_BUCKET: 'lens-media',
};

test('DigitalOcean Spaces uses its regional endpoint and AWS signing region', async () => {
  await withStorageEnv(spacesEnv, () => {
    const config = requireS3ProviderConfig(S3Provider.DigitalOcean);

    assert.equal(getActiveS3Provider(), S3Provider.DigitalOcean);
    assert.equal(config.endpoint, 'https://sgp1.digitaloceanspaces.com');
    assert.equal(config.region, 'us-east-1');
    assert.equal(config.bucketRegion, 'sgp1');
    assert.equal(config.forcePathStyle, false);
  });
});

test('DigitalOcean public object URLs use a bucket host or the configured CDN', async () => {
  await withStorageEnv(spacesEnv, () => {
    let config = requireS3ProviderConfig(S3Provider.DigitalOcean);
    const resolver = {
      resolve: () => ({ client: {} as unknown as S3Client, config }),
    } as unknown as S3ClientResolverService;
    const storage = new S3ObjectStorage(resolver, {} as S3ObjectService);

    assert.equal(
      storage.buildPublicObjectUrl('gallery/photo one.webp'),
      'https://lens-media.sgp1.digitaloceanspaces.com/gallery/photo%20one.webp',
    );

    process.env.S3_DIGITALOCEAN_CDN_ENDPOINT =
      'https://lens-media.sgp1.cdn.digitaloceanspaces.com/';
    config = requireS3ProviderConfig(S3Provider.DigitalOcean);
    assert.equal(
      storage.buildPublicObjectUrl('gallery/photo.webp'),
      'https://lens-media.sgp1.cdn.digitaloceanspaces.com/gallery/photo.webp',
    );
  });
});

test('external media URLs bypass S3 URL generation', async () => {
  const externalUrl = 'https://picsum.photos/seed/lens-reviewed-001/1600/1200';
  const resolver = {
    resolve: () => {
      throw new Error('S3 resolver should not be called for external URLs');
    },
  } as unknown as S3ClientResolverService;
  const storage = new S3ObjectStorage(resolver, {} as S3ObjectService);

  assert.equal(await storage.getUrl(externalUrl, 'public'), externalUrl);
  assert.equal(await storage.downloadUrl(externalUrl), externalUrl);
  assert.equal(storage.buildPublicObjectUrl(externalUrl), externalUrl);
});

test('MinIO remains path-style and Spaces aliases are accepted', async () => {
  await withStorageEnv(
    {
      S3_PROVIDER: 'minio',
      S3_MINIO_ENDPOINT: 'http://minio:9000',
      S3_MINIO_ACCESS_KEY_ID: 'minio-key',
      S3_MINIO_SECRET_ACCESS_KEY: 'minio-secret',
      S3_MINIO_BUCKET: 'lens',
    },
    () => {
      assert.equal(
        requireS3ProviderConfig(S3Provider.Minio).forcePathStyle,
        true,
      );
      process.env.S3_PROVIDER = 'spaces';
      assert.equal(getActiveS3Provider(), S3Provider.DigitalOcean);
      assert.equal(
        getS3ProviderConfig(S3Provider.Minio).endpoint,
        'http://minio:9000',
      );
    },
  );
});

test('DigitalOcean object listings use legacy marker pagination', async () => {
  await withStorageEnv(spacesEnv, async () => {
    const sent: Array<{ command: string; marker?: string }> = [];
    const pages = [
      {
        IsTruncated: true,
        NextMarker: 'gallery/photo-2.webp',
        Contents: [{ Key: 'gallery/photo-1.webp' }],
      },
      {
        IsTruncated: false,
        Contents: [{ Key: 'gallery/photo-2.webp' }],
      },
    ];
    const resolver = {
      resolve: () => ({
        config: { bucket: 'lens-media' },
        client: {
          send: async (command: { input: { Marker?: string } }) => {
            sent.push({
              command: command.constructor.name,
              marker: command.input.Marker,
            });
            return pages.shift();
          },
        },
      }),
    } as unknown as S3ClientResolverService;
    const objects = new S3ObjectService(resolver);

    assert.deepEqual(await objects.listAll({ prefix: 'gallery/' }), [
      'gallery/photo-1.webp',
      'gallery/photo-2.webp',
    ]);
    assert.deepEqual(sent, [
      { command: 'ListObjectsCommand', marker: undefined },
      { command: 'ListObjectsCommand', marker: 'gallery/photo-2.webp' },
    ]);
  });
});

test('DigitalOcean folder listings collect prefixes across legacy pages', async () => {
  await withStorageEnv(spacesEnv, async () => {
    const sent: Array<{ command: string; marker?: string }> = [];
    const pages = [
      {
        IsTruncated: true,
        NextMarker: 'albums/a/',
        CommonPrefixes: [{ Prefix: 'albums/a/' }],
      },
      {
        IsTruncated: false,
        CommonPrefixes: [{ Prefix: 'albums/b/' }],
      },
    ];
    const resolver = {
      resolve: () => ({
        config: { bucket: 'lens-media' },
        client: {
          send: async (command: { input: { Marker?: string } }) => {
            sent.push({
              command: command.constructor.name,
              marker: command.input.Marker,
            });
            return pages.shift();
          },
        },
      }),
    } as unknown as S3ClientResolverService;

    assert.deepEqual(
      await new S3ObjectService(resolver).list({ key: 'albums' }),
      ['a', 'b'],
    );
    assert.deepEqual(sent, [
      { command: 'ListObjectsCommand', marker: undefined },
      { command: 'ListObjectsCommand', marker: 'albums/a/' },
    ]);
  });
});

test('DigitalOcean configuration requires a region and Spaces credentials', async () => {
  await withStorageEnv(
    {
      S3_PROVIDER: 'digitalocean',
      S3_DIGITALOCEAN_BUCKET: 'lens-media',
    },
    () => {
      assert.throws(
        () => requireS3ProviderConfig(S3Provider.DigitalOcean),
        /DigitalOcean Spaces region is not configured/,
      );
      process.env.S3_DIGITALOCEAN_REGION = 'sgp1';
      assert.throws(
        () => requireS3ProviderConfig(S3Provider.DigitalOcean),
        /DigitalOcean Spaces credentials are not configured/,
      );
    },
  );
});
