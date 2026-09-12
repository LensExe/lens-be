import type { S3Provider } from '../enums/s3';

export interface S3BucketParams {
  provider: S3Provider;
  bucket?: string;
}

export interface S3PublicReadParams extends S3BucketParams {
  prefixes: string[];
}
