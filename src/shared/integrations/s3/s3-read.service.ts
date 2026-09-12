import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type {
  ListAllParams,
  ListParams,
  ReadBufferParams,
  ReadJsonParams,
  ReadTextParams,
} from './types/read';

@Injectable()
export class S3ReadService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  async text(params: ReadTextParams): Promise<string | null> {
    const { client, config } = this.resolver.resolve(params.provider);
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: params.key }),
      );
      return result.Body ? await result.Body.transformToString('utf-8') : '';
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async json<T>(params: ReadJsonParams): Promise<T | null> {
    const content = await this.text(params);
    return content === null ? null : (JSON.parse(content) as T);
  }

  async buffer(params: ReadBufferParams): Promise<Buffer | null> {
    const { client, config } = this.resolver.resolve(params.provider);
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: params.key }),
      );
      return result.Body
        ? Buffer.from(await result.Body.transformToByteArray())
        : Buffer.alloc(0);
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async list(params: ListParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve(params.provider);
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

  async listAll(params: ListAllParams): Promise<string[]> {
    const { client, config } = this.resolver.resolve(params.provider);
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

  async exists(params: ReadTextParams): Promise<boolean> {
    const { client, config } = this.resolver.resolve(params.provider);
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
