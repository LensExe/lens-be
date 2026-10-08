import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';
import { getActiveS3Provider } from './constants/s3';
import { S3Provider } from './enums/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import { S3ObjectService } from './s3-object.service';
import { isS3NotFound } from './s3-errors';
import { ObjectStorage, type PresignedUploadUrl } from './storage.port';

@Injectable()
export class S3ObjectStorage extends ObjectStorage {
  constructor(
    private readonly resolver: S3ClientResolverService,
    private readonly objects: S3ObjectService,
  ) {
    super();
  }

  /**
   * Create a presigned URL so the client (web or mobile) can upload a file directly to S3 using PUT.
   * Bind the Content-Type and expiration time (TTL) in advance. The expected
   * size is persisted and checked by `complete-upload`; it is intentionally
   * not signed as a `Content-Length` request header because browser `fetch`
   * cannot set that forbidden header reliably.
   *
   * @param key Key used by the operation.
   * @param type Type of object or operation.
   * @param size File size.
   * @returns Result object containing the fields `url`, `expiresIn`.
   */
  async uploadUrl(
    key: string,
    type: string,
    size: number,
  ): Promise<PresignedUploadUrl> {
    // Size remains part of the method contract and is enforced by complete().
    void size;
    const { config, client: presignClient } = this.resolver.resolve(true);
    const url = await getSignedUrl(
      presignClient,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: type,
      }),
      { expiresIn: config.presignedUrlTtlSeconds },
    );
    return { url, expiresIn: config.presignedUrlTtlSeconds };
  }

  /**
   * Verify a file after the client uploads it to S3:
   * - Check that the file actually exists in S3 (`HeadObjectCommand`).
   * - Check that its size and type match the details provided when requesting the upload URL.
   *
   * @param key Key used by the operation.
   * @param type Type of object or operation.
   * @param size File size.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  async verify(key: string, type: string, size: number): Promise<void> {
    const { config, client } = this.resolver.resolve();
    let metadata;
    try {
      metadata = await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch (error) {
      if (isS3NotFound(error)) {
        throw new DomainError('invalid', 'Uploaded object does not exist');
      }
      throw new DomainError(
        'unavailable',
        'Object storage verification failed',
      );
    }

    ensure(
      metadata.ContentLength === size && metadata.ContentType === type,
      'Uploaded object metadata mismatch',
    );
  }

  /**
   * Choose how to access an object based on the visibility saved by the backend in the database.
   * Use a fixed URL for public objects and a presigned GET URL for private objects.
   *
   * @param key Key used by the operation.
   * @param visibility Value used by the operation: visibility.
   * @returns Result of the operation described above.
   */
  async getUrl(key: string, visibility: 'public' | 'private'): Promise<string> {
    return visibility === 'public'
      ? this.buildPublicObjectUrl(key)
      : this.downloadUrl(key);
  }

  /**
   * Create a presigned URL to download or view a private file from S3 (GET), with an expiration time.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `getSignedUrl`.
   */
  async downloadUrl(key: string): Promise<string> {
    const { config, client: presignClient } = this.resolver.resolve(true);
    return getSignedUrl(
      presignClient,
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { expiresIn: config.presignedUrlTtlSeconds },
    );
  }

  /**
   * Create a fixed public URL for an object.
   * Use only for buckets or prefixes configured as public.
   *
   * @param key Key used by the operation.
   * @returns Result of the operation described above.
   */
  buildPublicObjectUrl(key: string): string {
    const provider = getActiveS3Provider();
    const { config } = this.resolver.resolve();
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    if (provider === S3Provider.DigitalOcean) {
      const base =
        config.publicObjectBaseUrl?.trim() ||
        `https://${config.bucket}.${config.bucketRegion}.digitaloceanspaces.com`;
      return `${base.replace(/\/+$/, '')}/${encodedKey}`;
    }

    const configuredBase =
      config.publicEndpoint?.trim() || config.endpoint?.trim();

    if (configuredBase) {
      return `${configuredBase.replace(/\/$/, '')}/${config.bucket}/${encodedKey}`;
    }
    if (provider === S3Provider.Cloud) {
      return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodedKey}`;
    }
    return `/${config.bucket}/${encodedKey}`;
  }

  /**
   * Delete a file from S3/MinIO by its key.
   *
   * @param key Key used by the operation.
   * @returns No value is returned.
   */
  async delete(key: string): Promise<void> {
    const { config, client } = this.resolver.resolve();
    try {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch {
      throw new DomainError('unavailable', 'Object storage delete failed');
    }
  }

  /**
   * Delete multiple objects in one or more `DeleteObjects` batches.
   * S3ObjectService splits requests into batches within S3 limits.
   *
   * @param keys List of keys to process.
   * @returns No value is returned.
   * @throws {Error} Thrown when the operation cannot be completed.
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.objects.deleteObjects({ keys });
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError('unavailable', 'S3 objects delete failed');
    }
  }
}
