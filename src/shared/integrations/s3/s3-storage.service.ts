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
   * Tạo Presigned URL để client (FE/Mobile) tự upload file trực tiếp lên S3 (PUT).
   * Ràng buộc sẵn Content-Type, Content-Length và thời gian hết hạn (TTL).
   */
  async uploadUrl(
    key: string,
    type: string,
    size: number,
  ): Promise<PresignedUploadUrl> {
    const { config, client: presignClient } = this.resolver.resolve(true);
    const url = await getSignedUrl(
      presignClient,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: type,
        ContentLength: size,
      }),
      { expiresIn: config.presignedUrlTtlSeconds },
    );
    return { url, expiresIn: config.presignedUrlTtlSeconds };
  }

  /**
   * Xác thực file sau khi client upload lên S3:
   * - Kiểm tra file có thực sự tồn tại trên S3 không (HeadObjectCommand).
   * - Kiểm tra size và type có đúng với thông tin đã cam kết lúc xin URL upload không.
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
   * Chọn cách truy cập object theo visibility đã được backend lưu trong database.
   * Public dùng URL cố định; private dùng Presigned GET URL.
   */
  async getUrl(key: string, visibility: 'public' | 'private'): Promise<string> {
    return visibility === 'public'
      ? this.buildPublicObjectUrl(key)
      : this.downloadUrl(key);
  }

  /**
   * Tạo Presigned URL để tải hoặc xem file private từ S3 (GET) kèm thời gian hết hạn.
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
   * Tạo URL public cố định cho object.
   * Chỉ dùng cho bucket/prefix đã được cấu hình public.
   */
  buildPublicObjectUrl(key: string): string {
    const provider = getActiveS3Provider();
    const { config } = this.resolver.resolve();
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
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
   * Xóa file khỏi S3/MinIO bằng key định danh.
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
   * Xóa nhiều object trong một hoặc nhiều batch DeleteObjects.
   * S3ObjectService tự chia batch tối đa theo giới hạn của S3.
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
