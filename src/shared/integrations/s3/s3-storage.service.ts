import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';
import { getActiveS3Provider } from './constants/s3';
import { S3Provider } from './enums/s3';
import { requireS3ProviderConfig } from './s3.config';
import { S3ObjectService } from './s3-object.service';
import { ObjectStorage } from './storage.port';
import type { S3ProviderConfig } from './types/config';

@Injectable()
export class S3ObjectStorage
  extends ObjectStorage
  implements OnApplicationShutdown
{
  private client?: S3Client;
  private presignClient?: S3Client;

  constructor(private readonly objects?: S3ObjectService) {
    super();
  }

  /**
   * Tạo Presigned URL để client (FE/Mobile) tự upload file trực tiếp lên S3 (PUT).
   * Ràng buộc sẵn Content-Type, Content-Length và thời gian hết hạn (TTL).
   */
  async uploadUrl(key: string, type: string, size: number): Promise<string> {
    const { config, presignClient } = this.getClients();
    return getSignedUrl(
      presignClient,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: type,
        ContentLength: size,
      }),
      { expiresIn: config.presignedUrlTtlSeconds },
    );
  }

  /**
   * Xác thực file sau khi client upload lên S3:
   * - Kiểm tra file có thực sự tồn tại trên S3 không (HeadObjectCommand).
   * - Kiểm tra size và type có đúng với thông tin đã cam kết lúc xin URL upload không.
   */
  async verify(key: string, type: string, size: number): Promise<void> {
    const { config, client } = this.getClients();
    let metadata;
    try {
      metadata = await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch {
      throw new DomainError(
        'invalid',
        'Uploaded object does not exist or storage is unavailable',
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
    const { config, presignClient } = this.getClients();
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
    const config = this.getConfig();
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
    const { config, client } = this.getClients();
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
    if (!this.objects) {
      throw new DomainError('unavailable', 'S3 object service is unavailable');
    }
    try {
      await this.objects.deleteObjects({ keys });
    } catch {
      throw new DomainError('unavailable', 'S3 objects delete failed');
    }
  }

  /**
   * Lấy và kiểm tra cấu hình S3 theo provider active của môi trường.
   * Ném lỗi ngay nếu thiếu thông tin xác thực hoặc endpoint.
   */
  private getConfig() {
    return requireS3ProviderConfig(getActiveS3Provider());
  }

  /**
   * Khởi tạo instance S3Client từ AWS SDK v3 với cấu hình và endpoint tương ứng.
   */
  private createClient(
    config: S3ProviderConfig & {
      accessKeyId: string;
      secretAccessKey: string;
    },
    endpoint: string | undefined,
  ): S3Client {
    return new S3Client({
      endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Khởi tạo và cache 2 S3Client (Lazy Initialization):
   * - client: Kết nối trực tiếp từ backend (dùng endpoint nội bộ, vd: http://minio:9000).
   * - presignClient: Tạo URL cho trình duyệt/client ngoài truy cập (dùng publicEndpoint).
   */
  private getClients() {
    const config = this.getConfig();
    this.client ??= this.createClient(config, config.endpoint);
    this.presignClient ??= this.createClient(
      config,
      config.publicEndpoint?.trim() || config.endpoint,
    );
    return { config, client: this.client, presignClient: this.presignClient };
  }

  /**
   * Lifecycle hook của NestJS: Tự động đóng các kết nối S3Client khi server tắt (tránh leak resource).
   */
  onApplicationShutdown(): void {
    this.client?.destroy();
    if (this.presignClient !== this.client) this.presignClient?.destroy();
  }
}
