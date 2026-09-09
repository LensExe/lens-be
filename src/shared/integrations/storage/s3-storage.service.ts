import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectStorage } from '../../database/unit-of-work/unit-of-work.port';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';

@Injectable()
export class S3ObjectStorage extends ObjectStorage {
  private client?: S3Client;
  private config() {
    // TODO: INSERT_S3_BUCKET, INSERT_S3_ACCESS_KEY_ID, INSERT_S3_SECRET_ACCESS_KEY.
    const bucket = process.env.S3_BUCKET_NAME;
    if (
      !bucket ||
      !process.env.S3_ACCESS_KEY_ID ||
      !process.env.S3_SECRET_ACCESS_KEY
    )
      throw new DomainError('unavailable', 'Object storage is not configured');
    this.client ??= new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
    return { client: this.client, bucket };
  }
  async uploadUrl(key: string, type: string, size: number) {
    const { client, bucket } = this.config();
    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: type,
        ContentLength: size,
      }),
      { expiresIn: 900 },
    );
  }
  async downloadUrl(key: string) {
    const { client, bucket } = this.config();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 900 },
    );
  }
  async verify(key: string, type: string, size: number) {
    const { client, bucket } = this.config();
    let meta;
    try {
      meta = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch {
      throw new DomainError(
        'invalid',
        'Uploaded object does not exist or storage is unavailable',
      );
    }
    ensure(
      meta.ContentLength === size && meta.ContentType === type,
      'Uploaded object metadata mismatch',
    );
  }
  async delete(key: string) {
    const { client, bucket } = this.config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
