import type { S3Provider } from '../enums/s3';

export interface S3CopySameBucketParams {
  sourceKey: string;
  destKey: string;
  provider: S3Provider;
}
