import { S3Provider } from '../enums/s3';
import { DomainError } from '../../../platform/exceptions/domain.error';

/**
 * Select the active object-storage provider from S3_PROVIDER.
 *
 * `spaces` and `digital-ocean` are accepted aliases for DigitalOcean Spaces.
 * Without an explicit value, retain the existing environment-based defaults.
 *
 * @returns Result of type S3Provider.
 */
export const getActiveS3Provider = (): S3Provider => {
  const configured = process.env.S3_PROVIDER?.trim().toLowerCase();
  if (!configured) {
    return process.env.NODE_ENV === 'production'
      ? S3Provider.Cloud
      : S3Provider.Minio;
  }

  switch (configured) {
    case 'cloud':
      return S3Provider.Cloud;
    case 'minio':
      return S3Provider.Minio;
    case 'digitalocean':
    case 'digital-ocean':
    case 'spaces':
      return S3Provider.DigitalOcean;
    default:
      throw new DomainError(
        'invalid',
        `Unsupported S3_PROVIDER "${configured}". Use "minio", "digitalocean", or "cloud".`,
      );
  }
};

export const ACTIVE_S3 = 'ACTIVE_S3';
export const ACTIVE_S3_PRESIGN = 'ACTIVE_S3_PRESIGN';

export const DEFAULT_S3_REGION = 'us-east-1';
export const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 900;
export const S3_DELETE_BATCH_SIZE = 1000;
