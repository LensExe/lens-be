import { DomainError } from '../../platform/exceptions/domain.error';
import {
  DEFAULT_PRESIGNED_URL_TTL_SECONDS,
  DEFAULT_S3_REGION,
} from './constants/s3';
import { S3Provider } from './enums/s3';
import type { S3ProviderConfig } from './types/config';

/**
 * Read a positive integer setting or use the default when the value is invalid.
 *
 * @param value Value used by the operation: value.
 * @param fallback Numeric value used by the operation: fallback.
 * @returns Result of the operation described above.
 */
const positiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Read and map S3 configuration from environment variables (`process.env`) for each provider.
 *
 * - Set defaults for region, presigned URL TTL, and `forcePathStyle` (MinIO: true; cloud: false).
 * - Cloud providers can use static credentials or the AWS SDK's default credential chain.
 *
 * @param provider S3 provider (MinIO or a cloud S3-compatible service).
 * @returns `S3ProviderConfig` object containing the connection settings.
 */
export function getS3ProviderConfig(provider: S3Provider): S3ProviderConfig {
  switch (provider) {
    case S3Provider.Cloud:
      return {
        endpoint: process.env.S3_CLOUD_ENDPOINT,
        publicEndpoint: process.env.S3_CLOUD_PUBLIC_ENDPOINT,
        region: process.env.S3_CLOUD_REGION ?? DEFAULT_S3_REGION,
        accessKeyId: process.env.S3_CLOUD_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_CLOUD_SECRET_ACCESS_KEY,
        bucket: process.env.S3_CLOUD_BUCKET,
        forcePathStyle: false,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_CLOUD_PRESIGNED_URL_TTL_SECONDS,
          DEFAULT_PRESIGNED_URL_TTL_SECONDS,
        ),
      };
    case S3Provider.Minio:
      return {
        endpoint: process.env.S3_MINIO_ENDPOINT,
        publicEndpoint: process.env.S3_MINIO_PUBLIC_ENDPOINT,
        region: process.env.S3_MINIO_REGION ?? DEFAULT_S3_REGION,
        accessKeyId: process.env.S3_MINIO_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_MINIO_SECRET_ACCESS_KEY,
        bucket: process.env.S3_MINIO_BUCKET,
        forcePathStyle: true,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_MINIO_PRESIGNED_URL_TTL_SECONDS,
          DEFAULT_PRESIGNED_URL_TTL_SECONDS,
        ),
      };
    default:
      throw new DomainError(
        'invalid',
        `Unsupported S3 provider: ${String(provider)}`,
      );
  }
}

/**
 * Get the configuration and validate that all required connection settings are present.
 *
 * - A bucket is always required.
 * - MinIO requires an endpoint and static credentials.
 * - Cloud providers can let the AWS SDK retrieve credentials from an IAM role or the default credential chain.
 *
 * @param provider S3 provider (MinIO or a cloud S3-compatible service).
 * @throws DomainError Throws `DomainError` if the configuration is missing or invalid.
 * @returns Complete S3 configuration with all required credentials.
 */
export function requireS3ProviderConfig(
  provider: S3Provider,
): S3ProviderConfig & { bucket: string } {
  const config = getS3ProviderConfig(provider);
  if (!config.bucket?.trim()) {
    throw new DomainError(
      'unavailable',
      `Object storage bucket for provider "${provider}" is not configured`,
    );
  }
  const hasAccessKey = Boolean(config.accessKeyId);
  const hasSecretKey = Boolean(config.secretAccessKey);
  if (hasAccessKey !== hasSecretKey) {
    throw new DomainError(
      'unavailable',
      `Object storage credentials for provider "${provider}" are incomplete`,
    );
  }
  if (provider === S3Provider.Minio && !config.endpoint?.trim()) {
    throw new DomainError('unavailable', 'MinIO endpoint is not configured');
  }
  if (provider === S3Provider.Minio && !hasAccessKey) {
    throw new DomainError(
      'unavailable',
      'MinIO credentials are not configured',
    );
  }
  return config as S3ProviderConfig & { bucket: string };
}
