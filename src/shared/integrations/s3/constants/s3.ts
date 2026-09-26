import { S3Provider } from '../enums/s3';

/** Provider active; ưu tiên S3_PROVIDER, fallback theo môi trường. */
export const getActiveS3Provider = (): S3Provider =>
  (process.env.S3_PROVIDER as S3Provider | undefined) ??
  (process.env.NODE_ENV === 'production' ? S3Provider.Cloud : S3Provider.Minio);

export const ACTIVE_S3 = 'ACTIVE_S3';
export const ACTIVE_S3_PRESIGN = 'ACTIVE_S3_PRESIGN';

export const DEFAULT_S3_REGION = 'us-east-1';
export const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 900;
export const S3_DELETE_BATCH_SIZE = 1000;
