import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  type BucketLocationConstraint,
  type CreateBucketCommandInput,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../platform/exceptions/domain.error';
import { getActiveS3Provider } from './constants/s3';
import { S3Provider } from './enums/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import { isS3NotFound } from './s3-errors';
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
      if (isS3NotFound(error)) return false;
      throw error;
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
    const bucket = params.bucket ?? config.bucket;
    const input: CreateBucketCommandInput = { Bucket: bucket };
    if (
      getActiveS3Provider() === S3Provider.Cloud &&
      config.region !== 'us-east-1'
    ) {
      input.CreateBucketConfiguration = {
        LocationConstraint: config.region as BucketLocationConstraint,
      };
    }
    try {
      await client.send(new CreateBucketCommand(input));
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
    const prefixes = [
      ...new Set(
        params.prefixes
          .map((prefix) => prefix.replace(/^\/+|\/+$/g, ''))
          .filter(Boolean),
      ),
    ];
    if (prefixes.length === 0) return;
    if (
      prefixes.some(
        (prefix) =>
          prefix.includes('*') ||
          prefix.includes('?') ||
          prefix.split('/').some((segment) => segment === '..'),
      )
    ) {
      throw new DomainError(
        'invalid',
        'Public object prefixes must not contain wildcards or parent traversal',
      );
    }
    const resources = prefixes.map(
      (prefix) => `arn:aws:s3:::${bucket}/${prefix}/*`,
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
