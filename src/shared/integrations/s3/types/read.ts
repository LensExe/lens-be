import type { S3Provider } from '../enums/s3';

export interface ReadObjectParams {
  key: string;
  provider: S3Provider;
}

export type ReadTextParams = ReadObjectParams;
export type ReadJsonParams = ReadObjectParams;
export type ReadBufferParams = ReadObjectParams;

export type ListParams = ReadObjectParams;

export interface ListAllParams {
  prefix: string;
  provider: S3Provider;
}
