import { S3Client } from '@aws-sdk/client-s3';
import type { Provider } from '@nestjs/common';
import {
  ACTIVE_S3,
  ACTIVE_S3_PRESIGN,
  getActiveS3Provider,
} from './constants/s3';
import { getS3ProviderConfig } from './s3.config';
import type { S3ProviderConfig } from './types/config';

/**
 * Create an AWS SDK v3 `S3Client` from the configuration.
 *
 * @param config S3 provider configuration (endpoint, credentials, region, `forcePathStyle`, and related settings).
 * @param presign Flag selecting the client type:
 * - `true`: Use `publicEndpoint` (if available) to sign presigned URLs for browsers and external clients.
 * - `false`: Use the internal endpoint for backend access to storage.
 * @returns Fully configured `S3Client` instance.
 */
const createClient = (config: S3ProviderConfig, presign: boolean): S3Client => {
  const endpoint = presign
    ? config.publicEndpoint?.trim() || config.endpoint
    : config.endpoint;
  const credentials =
    config.accessKeyId && config.secretAccessKey
      ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        }
      : undefined;
  return new S3Client({
    endpoint: endpoint || undefined,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials,
    // The presigned URL is consumed by the browser with a plain PUT. Newer
    // AWS SDK versions automatically add a CRC32 checksum to PutObject
    // requests; when that command is presigned, the checksum is calculated
    // before the browser's file body exists and the generated URL contains a
    // stale checksum query parameter. Disable the automatic checksum for the
    // presign client so S3 validates the uploaded object in `complete-upload`.
    ...(presign
      ? { requestChecksumCalculation: 'WHEN_REQUIRED' as const }
      : {}),
  });
};

/**
 * Helper that creates a custom provider for NestJS dependency injection.
 * Initialize a client only for the provider active in the current process.
 *
 * @param token Token identifying the provider in the dependency injection container.
 * @param presign Whether this client is dedicated to generating presigned URLs (defaults to `false`).
 * @returns `Provider<S3Client>` registered with the NestJS module.
 */
const clientProvider = (
  token: string,
  presign = false,
): Provider<S3Client> => ({
  provide: token,
  useFactory: () =>
    createClient(
      getS3ProviderConfig(getActiveS3Provider()), // get S3 active config
      presign, // is presign (true or false)
    ),
});

export const s3ClientProviders: Provider[] = [
  clientProvider(ACTIVE_S3),
  clientProvider(ACTIVE_S3_PRESIGN, true),
];
