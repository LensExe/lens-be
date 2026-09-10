import { S3Client } from '@aws-sdk/client-s3';
import type { Provider } from '@nestjs/common';
import {
  DIGITAL_OCEAN_S3,
  DIGITAL_OCEAN_S3_PRESIGN,
  MINIO_S3,
  MINIO_S3_PRESIGN,
} from './constants/s3';
import { S3Provider } from './enums/s3';
import { getS3ProviderConfig } from './s3.config';
import type { S3ProviderConfig } from './types/config';

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
  });
};

const clientProvider = (
  token: string,
  provider: S3Provider,
  presign = false,
): Provider<S3Client> => ({
  provide: token,
  useFactory: () => createClient(getS3ProviderConfig(provider), presign),
});

export const s3ClientProviders: Provider[] = [
  clientProvider(DIGITAL_OCEAN_S3, S3Provider.DigitalOcean),
  clientProvider(DIGITAL_OCEAN_S3_PRESIGN, S3Provider.DigitalOcean, true),
  clientProvider(MINIO_S3, S3Provider.Minio),
  clientProvider(MINIO_S3_PRESIGN, S3Provider.Minio, true),
];
