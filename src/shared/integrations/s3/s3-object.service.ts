import {
  ChecksumAlgorithm,
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { S3_DELETE_BATCH_SIZE } from './constants/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
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
   * Upload dữ liệu JSON lên storage.
   * Tự động serialize payload thành chuỗi JSON và gán Content-Type là application/json.
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
   * Upload dữ liệu nhị phân (Buffer) trực tiếp lên storage.
   * Thường dùng để lưu ảnh hoặc tài liệu đã được xử lý trong bộ nhớ RAM.
   */
  async uploadBuffer(params: UploadBufferParams): Promise<void> {
    await this.put({
      name: params.name,
      body: params.buffer,
      contentType: params.contentType,
    });
  }

  /**
   * Upload dữ liệu dạng luồng (ReadableStream) lên storage.
   * Giúp tối ưu bộ nhớ RAM khi upload file dung lượng lớn.
   */
  async uploadStream(params: UploadStreamParams): Promise<void> {
    await this.put({
      name: params.name,
      body: params.stream,
      contentType: params.contentType,
    });
  }

  /**
   * Đọc nội dung tệp tin từ storage dưới dạng chuỗi văn bản (UTF-8).
   * Trả về `null` nếu tệp tin không tồn tại.
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
   * Đọc nội dung tệp tin JSON từ storage và parse thành object kiểu T.
   * Trả về `null` nếu tệp tin không tồn tại.
   */
  async readJson<T>(params: ReadJsonParams): Promise<T | null> {
    const content = await this.readText(params);
    return content === null ? null : (JSON.parse(content) as T);
  }

  /**
   * Đọc dữ liệu nhị phân thô của tệp tin từ storage và trả về Buffer.
   * Trả về `null` nếu tệp tin không tồn tại.
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
   * Liệt kê danh sách các thư mục con cấp 1 (sub-prefixes) theo đường dẫn.
   * Tương tự như xem danh sách folder con bên trong một thư mục.
   */
  async list(params: ListParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve();
    const prefix = params.key.endsWith('/') ? params.key : `${params.key}/`;
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        Delimiter: '/',
      }),
    );
    return (result.CommonPrefixes ?? []).flatMap(({ Prefix }) =>
      Prefix ? [Prefix.slice(prefix.length).replace(/\/$/, '')] : [],
    );
  }

  /**
   * Quét và lấy toàn bộ danh sách file key khớp với tiền tố prefix.
   * Tự động phân trang (ContinuationToken) cho đến khi lấy hết tất cả các file.
   */
  async listAll(params: ListAllParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve();
    const keys: string[] = [];
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
      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);
    return keys;
  }

  /**
   * Kiểm tra nhanh tệp tin có tồn tại trên storage hay không (HeadObjectCommand).
   * Không tải nội dung file nên tốc độ xử lý nhanh và tiết kiệm băng thông.
   */
  async exists(params: ReadTextParams): Promise<boolean> {
    const { client, config } = this.resolver.resolve();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: params.key }),
      );
      return true;
    } catch (error) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  /**
   * Xóa hàng loạt tệp tin theo danh sách keys.
   * Tự động chia nhỏ mảng keys thành từng đợt (batch) để đảm bảo không vượt quá giới hạn SDK.
   * Trả về tổng số tệp tin đã xóa thành công.
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
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          ChecksumAlgorithm: ChecksumAlgorithm.MD5,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
      deleted += keys.length;
    }
    return deleted;
  }

  /**
   * Sao chép một tệp tin từ sourceKey sang destKey trong cùng bucket.
   * Xử lý trực tiếp trên server của S3 mà không cần backend tải về rồi upload lại.
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

  /** Helper nội bộ thực thi lệnh PutObjectCommand. */
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
   * Helper nội bộ thực thi lệnh GetObjectCommand.
   * Tự động bắt lỗi 404/NoSuchKey và trả về null thay vì crash ứng dụng.
   */
  private async get(key: string): Promise<GetObjectCommandOutput | null> {
    const { client, config } = this.resolver.resolve();
    try {
      return await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  /**
   * Helper kiểm tra xem lỗi ném ra từ AWS SDK có phải là lỗi "tệp không tồn tại" (404 / NoSuchKey) hay không.
   */
  private isNotFound(error: unknown): boolean {
    const candidate = error as {
      name?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      candidate?.name === 'NoSuchKey' ||
      candidate?.name === 'NotFound' ||
      candidate?.Code === 'NoSuchKey' ||
      candidate?.$metadata?.httpStatusCode === 404
    );
  }
}
