import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { S3Provider } from './enums/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type {
  BuildPublicUrlParams,
  BuildSignedGetUrlParams,
  BuildSignedPutUrlParams,
} from './types/build';

@Injectable()
export class S3BuildService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  buildPublicObjectUrl(params: BuildPublicUrlParams): string {
    const { config } = this.resolver.resolve(params.provider, true);
    const key = params.key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const configuredBase =
      config.publicEndpoint?.trim() || config.endpoint?.trim();
    if (configuredBase) {
      return `${configuredBase.replace(/\/$/, '')}/${config.bucket}/${key}`;
    }
    if (params.provider === S3Provider.DigitalOcean) {
      return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    }
    return `/${config.bucket}/${key}`;
  }

  async buildSignedGetObjectUrl(
    params: BuildSignedGetUrlParams,
  ): Promise<string> {
    const { client, config } = this.resolver.resolve(params.provider, true);
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: params.key }),
      {
        expiresIn: params.expiresInSeconds ?? config.presignedUrlTtlSeconds,
      },
    );
  }

  async buildSignedPutObjectUrl(
    params: BuildSignedPutUrlParams,
  ): Promise<string> {
    const { client, config } = this.resolver.resolve(params.provider, true);
    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.key,
        ContentType: params.contentType,
      }),
      {
        expiresIn: params.expiresInSeconds ?? config.presignedUrlTtlSeconds,
      },
    );
  }
}
