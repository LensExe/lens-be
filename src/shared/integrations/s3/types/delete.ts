import type { S3Provider } from '../enums/s3';

export interface DeleteObjectsParams {
  keys: string[];
  provider: S3Provider;
}
