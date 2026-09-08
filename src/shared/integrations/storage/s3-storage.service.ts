import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService, UploadFileOptions } from './storage.interface';

/**
 * Service mẫu cho S3 / MinIO Storage.
 * Bạn có thể cài đặt `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner` để kết nối AWS S3 / MinIO thực tế.
 */
@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket: string;
  private readonly endpoint?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = process.env.S3_BUCKET_NAME ?? 'lens-storage';
    this.endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
    this.logger.log(`Initialized Storage Service for bucket: ${this.bucket}`);
  }

  async uploadFile(options: UploadFileOptions): Promise<string> {
    this.logger.log(
      `Uploading file: ${options.key} (${options.contentType}, ${options.buffer.length} bytes)`,
    );
    await Promise.resolve();
    // TODO: Triển khai với S3Client.send(new PutObjectCommand(...))
    const fileUrl = `${this.endpoint}/${this.bucket}/${options.key}`;
    return fileUrl;
  }

  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    this.logger.log(
      `Generating presigned URL for: ${key} (expires in ${expiresInSeconds}s)`,
    );
    await Promise.resolve();
    // TODO: Triển khai với getSignedUrl(s3Client, new GetObjectCommand(...), { expiresIn })
    return `${this.endpoint}/${this.bucket}/${key}?presigned=true&expires=${expiresInSeconds}`;
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting file from storage: ${key}`);
    await Promise.resolve();
    // TODO: Triển khai với S3Client.send(new DeleteObjectCommand(...))
  }
}
