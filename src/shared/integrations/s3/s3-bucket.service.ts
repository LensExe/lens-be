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
   * Check whether a bucket exists in storage and whether the account can access it.
   *
   * - Use `HeadBucketCommand` to quickly check bucket metadata.
   * - If `params.bucket` is not specified, check the default bucket in the configuration (`config.bucket`).
   * - Return `true` if the bucket exists and `false` if it has not been created (404).
   * - Rethrow 403 Forbidden errors (the bucket exists, but the account lacks permission).
   *
   * @param params params data of type S3BucketParams.
   * @returns Boolean indicating the result of the check or operation.
   * @throws {Error} Thrown when the operation cannot be completed.
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
   * Create a bucket in storage (S3/MinIO).
   *
   * - Use `CreateBucketCommand`.
   * - Throw `DomainError('unavailable')` if bucket creation fails.
   * - Typically used when initializing a project, seeding data, or running integration tests.
   *
   * @param params params data of type S3BucketParams.
   * @returns No value is returned.
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
   * Set a bucket policy to allow public read access for specified folders or prefixes.
   *
   * - Automatically build ARN resources (`arn:aws:s3:::bucket/prefix/*`).
   * - Grant `s3:GetObject` to everyone (`Principal: '*'`) for these prefixes with `PutBucketPolicyCommand`.
   * - Files in these folders (for example, avatars and thumbnails) can then be accessed publicly
   * without configuring an ACL for every individual file (especially important for MinIO).
   *
   * @param params params data of type S3PublicReadParams.
   * @returns No value is returned.
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
