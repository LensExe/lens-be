import {
  ChecksumAlgorithm,
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { DomainError } from '../../platform/exceptions/domain.error';
import { getActiveS3Provider, S3_DELETE_BATCH_SIZE } from './constants/s3';
import { S3Provider } from './enums/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import { isS3NotFound } from './s3-errors';
import type { S3CopySameBucketParams } from './types/copy';
import type { DeleteObjectsParams } from './types/delete';
import type {
  ListAllParams,
  ListParams,
  ReadBufferParams,
  ReadJsonParams,
  ReadTextParams,
} from './types/read';
import type {
  UploadBufferParams,
  UploadJsonParams,
  UploadStreamParams,
} from './types/upload';

/**
 * Low-level object operations shared by AWS S3 and S3-compatible providers.
 *
 * The service is intentionally separate from S3ObjectStorage, which adapts
 * this integration to the domain-level ObjectStorage port used by media.
 */
@Injectable()
export class S3ObjectService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  /**
   * Upload JSON data to storage.
   * Automatically serialize the payload as JSON and set Content-Type to `application/json`.
   *
   * @param params params data of type UploadJsonParams<T>.
   * @returns No value is returned.
   */
  async uploadJson<T>(params: UploadJsonParams<T>): Promise<void> {
    const body = JSON.stringify(params.payload);
    await this.put({
      name: params.name,
      body,
      contentType: 'application/json',
    });
  }

  /**
   * Upload binary data (Buffer) directly to storage.
   * Typically used to store images or documents processed in memory.
   *
   * @param params params data of type UploadBufferParams.
   * @returns No value is returned.
   */
  async uploadBuffer(params: UploadBufferParams): Promise<void> {
    await this.put({
      name: params.name,
      body: params.buffer,
      contentType: params.contentType,
    });
  }

  /**
   * Upload data to storage as a ReadableStream.
   * Helps reduce RAM usage when uploading large files.
   *
   * @param params params data of type UploadStreamParams.
   * @returns No value is returned.
   */
  async uploadStream(params: UploadStreamParams): Promise<void> {
    await this.put({
      name: params.name,
      body: params.stream,
      contentType: params.contentType,
    });
  }

  /**
   * Read a file from storage as UTF-8 text.
   * Return `null` if the file does not exist.
   *
   * @param params params data of type ReadTextParams.
   * @returns Result of the operation described above.
   */
  async readText(params: ReadTextParams): Promise<string | null> {
    const result = await this.get(params.key);
    return result?.Body
      ? result.Body.transformToString('utf-8')
      : result === null
        ? null
        : '';
  }

  /**
   * Read a JSON file from storage and parse it as an object of type T.
   * Return `null` if the file does not exist.
   *
   * @param params params data of type ReadJsonParams.
   * @returns Result of the operation described above.
   */
  async readJson<T>(params: ReadJsonParams): Promise<T | null> {
    const content = await this.readText(params);
    return content === null ? null : (JSON.parse(content) as T);
  }

  /**
   * Read a file's raw binary data from storage and return a Buffer.
   * Return `null` if the file does not exist.
   *
   * @param params params data of type ReadBufferParams.
   * @returns Result of the operation described above.
   */
  async readBuffer(params: ReadBufferParams): Promise<Buffer | null> {
    const result = await this.get(params.key);
    return result?.Body
      ? Buffer.from(await result.Body.transformToByteArray())
      : result === null
        ? null
        : Buffer.alloc(0);
  }

  /**
   * List first-level child folders (sub-prefixes) under a path.
   * Similar to listing subfolders inside a folder.
   *
   * @param params params data of type ListParams.
   * @returns Result returned by `flatMap`.
   */
  async list(params: ListParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve();
    const prefix = params.key.endsWith('/') ? params.key : `${params.key}/`;
    const prefixes = new Set<string>();

    if (getActiveS3Provider() === S3Provider.DigitalOcean) {
      let marker: string | undefined;
      do {
        const result = await client.send(
          new ListObjectsCommand({
            Bucket: config.bucket,
            Prefix: prefix,
            Delimiter: '/',
            Marker: marker,
          }),
        );
        for (const { Prefix } of result.CommonPrefixes ?? []) {
          if (Prefix)
            prefixes.add(Prefix.slice(prefix.length).replace(/\/$/, ''));
        }
        const nextMarker =
          result.NextMarker ??
          result.CommonPrefixes?.at(-1)?.Prefix ??
          result.Contents?.at(-1)?.Key;
        if (result.IsTruncated && (!nextMarker || nextMarker === marker)) {
          throw new DomainError(
            'unavailable',
            'DigitalOcean Spaces returned a truncated object listing without a usable marker',
          );
        }
        marker = result.IsTruncated ? nextMarker : undefined;
      } while (marker);
      return [...prefixes];
    }

    let continuationToken: string | undefined;
    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: prefix,
          Delimiter: '/',
          ContinuationToken: continuationToken,
        }),
      );
      for (const { Prefix } of result.CommonPrefixes ?? []) {
        if (Prefix)
          prefixes.add(Prefix.slice(prefix.length).replace(/\/$/, ''));
      }
      const nextToken = result.NextContinuationToken;
      if (
        result.IsTruncated &&
        (!nextToken || nextToken === continuationToken)
      ) {
        throw new DomainError(
          'unavailable',
          'Object storage returned a truncated listing without a usable continuation token',
        );
      }
      continuationToken = result.IsTruncated ? nextToken : undefined;
    } while (continuationToken);

    return [...prefixes];
  }

  /**
   * Scan and return all file keys matching the prefix.
   * Use S3 continuation tokens, or legacy marker pagination for DigitalOcean Spaces.
   *
   * @param params params data of type ListAllParams.
   * @returns Processed keys value.
   */
  async listAll(params: ListAllParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve();
    const keys: string[] = [];

    if (getActiveS3Provider() === S3Provider.DigitalOcean) {
      let marker: string | undefined;
      do {
        const result = await client.send(
          new ListObjectsCommand({
            Bucket: config.bucket,
            Prefix: params.prefix,
            Marker: marker,
          }),
        );
        for (const object of result.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        const nextMarker = result.NextMarker ?? result.Contents?.at(-1)?.Key;
        if (result.IsTruncated && (!nextMarker || nextMarker === marker)) {
          throw new DomainError(
            'unavailable',
            'DigitalOcean Spaces returned a truncated object listing without a usable marker',
          );
        }
        marker = result.IsTruncated ? nextMarker : undefined;
      } while (marker);
      return keys;
    }

    let continuationToken: string | undefined;
    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: params.prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of result.Contents ?? []) {
        if (object.Key) keys.push(object.Key);
      }
      const nextToken = result.NextContinuationToken;
      if (
        result.IsTruncated &&
        (!nextToken || nextToken === continuationToken)
      ) {
        throw new DomainError(
          'unavailable',
          'Object storage returned a truncated listing without a usable continuation token',
        );
      }
      continuationToken = result.IsTruncated ? nextToken : undefined;
    } while (continuationToken);
    return keys;
  }

  /**
   * Quickly check whether a file exists in storage (`HeadObjectCommand`).
   * Does not download file contents, so it is fast and saves bandwidth.
   *
   * @param params params data of type ReadTextParams.
   * @returns Boolean indicating the result of the check or operation.
   * @throws {Error} Thrown when the operation cannot be completed.
   */
  async exists(params: ReadTextParams): Promise<boolean> {
    const { client, config } = this.resolver.resolve();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: params.key }),
      );
      return true;
    } catch (error) {
      if (isS3NotFound(error)) return false;
      throw error;
    }
  }

  /**
   * Delete multiple files by their keys.
   * Split keys into batches automatically to stay within SDK limits.
   * Return the total number of files deleted successfully.
   *
   * @param params params data of type DeleteObjectsParams.
   * @returns Result of the operation described above.
   */
  async deleteObjects(params: DeleteObjectsParams): Promise<number> {
    if (params.keys.length === 0) return 0;
    const { client, config } = this.resolver.resolve();
    let deleted = 0;
    for (
      let offset = 0;
      offset < params.keys.length;
      offset += S3_DELETE_BATCH_SIZE
    ) {
      const keys = params.keys.slice(offset, offset + S3_DELETE_BATCH_SIZE);
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          ChecksumAlgorithm: ChecksumAlgorithm.MD5,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: false,
          },
        }),
      );
      if (result.Errors?.length) {
        const failedKeys = result.Errors.map(({ Key }) => Key).filter(
          (key): key is string => Boolean(key),
        );
        throw new DomainError(
          'unavailable',
          `Failed to delete ${result.Errors.length} object(s): ${failedKeys.join(', ')}`,
        );
      }
      deleted += result.Deleted?.length ?? keys.length;
    }
    return deleted;
  }

  /**
   * Copy a file from `sourceKey` to `destKey` in the same bucket.
   * Runs directly on the S3 server; the backend does not need to download and upload the file again.
   *
   * @param params params data of type S3CopySameBucketParams.
   * @returns No value is returned.
   */
  async copySameBucket(params: S3CopySameBucketParams): Promise<void> {
    if (params.sourceKey === params.destKey) return;
    const { client, config } = this.resolver.resolve();
    const source = params.sourceKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    await client.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        Key: params.destKey,
        CopySource: `${config.bucket}/${source}`,
      }),
    );
  }

  /**
   * Internal helper that executes `PutObjectCommand`.
   *
   * @param params Value used by the operation: params.
   * @returns No value is returned.
   */
  private async put(params: {
    name: string;
    body: string | Buffer | Readable;
    contentType?: string;
  }): Promise<void> {
    const { client, config } = this.resolver.resolve();
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.name,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  /**
   * Internal helper that executes `GetObjectCommand`.
   * Automatically catch 404/NoSuchKey errors and return `null` instead of crashing the application.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `send`.
   * @throws {Error} Thrown when the operation cannot be completed.
   */
  private async get(key: string): Promise<GetObjectCommandOutput | null> {
    const { client, config } = this.resolver.resolve();
    try {
      return await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch (error) {
      if (isS3NotFound(error)) return null;
      throw error;
    }
  }
}
