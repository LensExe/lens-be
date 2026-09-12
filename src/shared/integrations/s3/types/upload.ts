import type { ObjectCannedACL } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import type { S3Provider } from '../enums/s3';

export interface UploadJsonParams<T> {
  name: string;
  payload: T;
  acl?: ObjectCannedACL;
  providers: S3Provider[];
}

export interface UploadBufferParams {
  name: string;
  buffer: Buffer;
  acl?: ObjectCannedACL;
  provider: S3Provider;
  contentType?: string;
}

export interface UploadStreamParams {
  name: string;
  stream: Readable;
  acl?: ObjectCannedACL;
  provider: S3Provider;
  contentType?: string;
}
