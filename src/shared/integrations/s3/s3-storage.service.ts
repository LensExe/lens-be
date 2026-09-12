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
import { S3Provider } from './enums/s3';
import { requireS3ProviderConfig } from './s3.config';
import { ObjectStorage } from './storage.port';
import type { S3ProviderConfig } from './types/config';

@Injectable()
export class S3ObjectStorage
  extends ObjectStorage
  implements OnApplicationShutdown
{
  private client?: S3Client;
  private presignClient?: S3Client;

  private getConfig() {
    return requireS3ProviderConfig(S3Provider.Minio);
  }

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
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private getClients() {
    const config = this.getConfig();
    this.client ??= this.createClient(config, config.endpoint);
    this.presignClient ??= this.createClient(
      config,
      config.publicEndpoint?.trim() || config.endpoint,
    );
    return { config, client: this.client, presignClient: this.presignClient };
  }

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

  async downloadUrl(key: string): Promise<string> {
    const { config, presignClient } = this.getClients();
    return getSignedUrl(
      presignClient,
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { expiresIn: config.presignedUrlTtlSeconds },
    );
  }

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

  onApplicationShutdown(): void {
    this.client?.destroy();
    if (this.presignClient !== this.client) this.presignClient?.destroy();
  }
}
