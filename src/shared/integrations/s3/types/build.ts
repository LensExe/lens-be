import type { S3Provider } from '../enums/s3';

export interface BuildPublicUrlParams {
  key: string;
  provider: S3Provider;
}

export interface BuildSignedGetUrlParams extends BuildPublicUrlParams {
  expiresInSeconds?: number;
}

export interface BuildSignedPutUrlParams extends BuildPublicUrlParams {
  contentType?: string;
  expiresInSeconds?: number;
}
