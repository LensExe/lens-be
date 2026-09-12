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

  async checkExists(params: S3BucketParams): Promise<boolean> {
    const { client, config } = this.resolver.resolve(params.provider);
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

  async create(params: S3BucketParams): Promise<void> {
    const { client, config } = this.resolver.resolve(params.provider);
    try {
      await client.send(
        new CreateBucketCommand({ Bucket: params.bucket ?? config.bucket }),
      );
    } catch {
      throw new DomainError('unavailable', 'S3 bucket creation failed');
    }
  }

  async ensurePublicReadPrefixes(params: S3PublicReadParams): Promise<void> {
    const { client, config } = this.resolver.resolve(params.provider);
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
