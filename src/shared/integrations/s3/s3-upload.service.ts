import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { S3Provider } from './enums/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type {
  UploadBufferParams,
  UploadJsonParams,
  UploadStreamParams,
} from './types/upload';

@Injectable()
export class S3UploadService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  async json<T>(params: UploadJsonParams<T>): Promise<void> {
    const body = JSON.stringify(params.payload);
    await Promise.all(
      params.providers.map((provider) =>
        this.put({
          provider,
          name: params.name,
          body,
          acl: params.acl,
          contentType: 'application/json',
        }),
      ),
    );
  }

  async buffer(params: UploadBufferParams): Promise<void> {
    await this.put({
      provider: params.provider,
      name: params.name,
      body: params.buffer,
      acl: params.acl,
      contentType: params.contentType,
    });
  }

  async stream(params: UploadStreamParams): Promise<void> {
    await this.put({
      provider: params.provider,
      name: params.name,
      body: params.stream,
      acl: params.acl,
      contentType: params.contentType,
    });
  }

  private async put(params: {
    provider: S3Provider;
    name: string;
    body: string | Buffer | Readable;
    acl?: UploadBufferParams['acl'];
    contentType?: string;
  }): Promise<void> {
    const { client, config } = this.resolver.resolve(params.provider);
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.name,
        Body: params.body,
        ContentType: params.contentType,
        ACL:
          params.provider === S3Provider.DigitalOcean ? params.acl : undefined,
      }),
    );
  }
}
