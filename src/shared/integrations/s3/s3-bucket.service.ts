import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../platform/exceptions/domain.error';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type { S3BucketParams, S3PublicReadParams } from './types/bucket';

@Injectable()
export class S3BucketService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  /**
   * Kiểm tra xem một Bucket có tồn tại trên storage và tài khoản có quyền truy cập hay không.
   *
   * - Sử dụng lệnh HeadBucketCommand để kiểm tra nhanh metadata của bucket.
   * - Nếu không chỉ định params.bucket thì kiểm tra bucket mặc định trong cấu hình (config.bucket).
   * - Trả về `true` nếu bucket tồn tại, `false` nếu bucket chưa được tạo (404).
   * - Ném lại lỗi nếu gặp lỗi 403 Forbidden (bucket có tồn tại nhưng tài khoản không có quyền).
   */
  async checkExists(params: S3BucketParams): Promise<boolean> {
    const { client, config } = this.resolver.resolve();
    try {
      await client.send(
        new HeadBucketCommand({ Bucket: params.bucket ?? config.bucket }),
      );
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      if (status === 403) throw error;
      return false;
    }
  }

  /**
   * Tạo mới một Bucket trên storage (S3 / MinIO).
   *
   * - Sử dụng lệnh CreateBucketCommand.
   * - Ném lỗi DomainError('unavailable') nếu quá trình tạo bucket thất bại.
   * - Thường dùng khi khởi tạo dự án lần đầu, seed dữ liệu hoặc trong các kịch bản test integration.
   */
  async create(params: S3BucketParams): Promise<void> {
    const { client, config } = this.resolver.resolve();
    try {
      await client.send(
        new CreateBucketCommand({ Bucket: params.bucket ?? config.bucket }),
      );
    } catch {
      throw new DomainError('unavailable', 'S3 bucket creation failed');
    }
  }

  /**
   * Thiết lập Bucket Policy cho phép công khai đọc (Public Read) các thư mục/tiền tố chỉ định.
   *
   * - Tự động tạo danh sách tài nguyên định dạng ARN (arn:aws:s3:::bucket/prefix/*).
   * - Gán quyền `s3:GetObject` cho mọi người (`Principal: '*'`) trên các prefix này qua lệnh PutBucketPolicyCommand.
   * - Giúp các file nằm trong các thư mục này (vd: avatar, thumbnail...) có thể truy cập công khai
   *   mà không cần cấu hình ACL cho từng file riêng lẻ (đặc biệt quan trọng với MinIO).
   */
  async ensurePublicReadPrefixes(params: S3PublicReadParams): Promise<void> {
    const { client, config } = this.resolver.resolve();
    const bucket = params.bucket ?? config.bucket;
    const resources = params.prefixes.map(
      (prefix) =>
        `arn:aws:s3:::${bucket}/${prefix.replace(/^\/+|\/+$/g, '')}/*`,
    );
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: resources,
            },
          ],
        }),
      }),
    );
  }
}
