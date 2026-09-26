import type { Readable } from 'node:stream';

export interface UploadJsonParams<T> {
  name: string;
  payload: T;
}

export interface UploadBufferParams {
  name: string;
  buffer: Buffer;
  contentType?: string;
}

export interface UploadStreamParams {
  name: string;
  stream: Readable;
  contentType?: string;
}
