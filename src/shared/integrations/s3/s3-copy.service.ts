import { CopyObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type { S3CopySameBucketParams } from './types/copy';

@Injectable()
export class S3CopyService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  async copySameBucket(params: S3CopySameBucketParams): Promise<void> {
    if (params.sourceKey === params.destKey) return;
    const { client, config } = this.resolver.resolve(params.provider);
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
}
