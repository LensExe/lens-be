import { DomainError } from '../../platform/exceptions/domain.error';
import {
  DEFAULT_PRESIGNED_URL_TTL_SECONDS,
  DEFAULT_S3_REGION,
} from './constants/s3';
import { S3Provider } from './enums/s3';
import type { S3ProviderConfig } from './types/config';

const positiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

export function getS3ProviderConfig(provider: S3Provider): S3ProviderConfig {
  switch (provider) {
    case S3Provider.DigitalOcean:
      return {
        endpoint:
          process.env.S3_CLOUD_ENDPOINT ??
          process.env.S3_DIGITAL_OCEAN_ENDPOINT,
        publicEndpoint:
          process.env.S3_CLOUD_PUBLIC_ENDPOINT ??
          process.env.S3_DIGITAL_OCEAN_PUBLIC_ENDPOINT,
        region:
          process.env.S3_CLOUD_REGION ??
          process.env.S3_DIGITAL_OCEAN_REGION ??
          DEFAULT_S3_REGION,
        accessKeyId:
          process.env.S3_CLOUD_ACCESS_KEY_ID ??
          process.env.S3_DIGITAL_OCEAN_ACCESS_KEY_ID,
        secretAccessKey:
          process.env.S3_CLOUD_SECRET_ACCESS_KEY ??
          process.env.S3_DIGITAL_OCEAN_SECRET_ACCESS_KEY,
        bucket:
          process.env.S3_CLOUD_BUCKET ?? process.env.S3_DIGITAL_OCEAN_BUCKET,
        forcePathStyle: false,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_CLOUD_PRESIGNED_URL_TTL_SECONDS ??
            process.env.S3_DIGITAL_OCEAN_PRESIGNED_URL_TTL_SECONDS,
          DEFAULT_PRESIGNED_URL_TTL_SECONDS,
        ),
      };
    case S3Provider.Minio:
      return {
        endpoint: process.env.S3_MINIO_ENDPOINT ?? process.env.S3_ENDPOINT,
        publicEndpoint:
          process.env.S3_MINIO_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
        region:
          process.env.S3_MINIO_REGION ??
          process.env.S3_REGION ??
          DEFAULT_S3_REGION,
        accessKeyId:
          process.env.S3_MINIO_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID,
        secretAccessKey:
          process.env.S3_MINIO_SECRET_ACCESS_KEY ??
          process.env.S3_SECRET_ACCESS_KEY,
        bucket: process.env.S3_MINIO_BUCKET ?? process.env.S3_BUCKET_NAME,
        forcePathStyle: true,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_MINIO_PRESIGNED_URL_TTL_SECONDS ??
            process.env.S3_PRESIGNED_URL_TTL_SECONDS,
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

export function requireS3ProviderConfig(
  provider: S3Provider,
): Required<Omit<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>> &
  Pick<S3ProviderConfig, 'endpoint' | 'publicEndpoint'> {
  const config = getS3ProviderConfig(provider);
  if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    throw new DomainError(
      'unavailable',
      `Object storage provider "${provider}" is not configured`,
    );
  }
  if (provider === S3Provider.Minio && !config.endpoint) {
    throw new DomainError('unavailable', 'MinIO endpoint is not configured');
  }
  return config as Required<
    Omit<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>
  > &
    Pick<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>;
}
