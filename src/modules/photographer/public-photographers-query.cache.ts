import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/database/redis/redis.service';

/** Short-lived response cache for public photographer discovery and profile queries. */
@Injectable()
export class PublicPhotographersQueryCache {
  private static readonly VERSION_KEY = 'photographers:public-queries:version';
  private static readonly KEY_PREFIX = 'photographers:public-queries:v1';
  private static readonly TTL_SECONDS = 30;

  private readonly logger = new Logger(PublicPhotographersQueryCache.name);

  constructor(private readonly redis: RedisService) {}

  /** Cache one public query result by operation and its complete input. */
  async getOrLoad<T>(
    operation: string,
    input: unknown,
    load: () => Promise<T>,
  ): Promise<T> {
    let version: string | null = null;
    let key: string | null = null;
    try {
      version =
        (await this.redis.get(PublicPhotographersQueryCache.VERSION_KEY)) ??
        '0';
      key = this.key(version, operation, input);
      const cached = await this.redis.getJson<T>(key);
      if (cached !== null) return cached;
    } catch (error) {
      this.logger.warn(
        `Public photographer query cache read failed: ${this.errorMessage(error)}`,
      );
    }

    const result = await load();
    if (key) {
      try {
        await this.redis.setJson(
          key,
          result,
          PublicPhotographersQueryCache.TTL_SECONDS,
        );
      } catch (error) {
        this.logger.warn(
          `Public photographer query cache write failed: ${this.errorMessage(error)}`,
        );
      }
    }
    return result;
  }

  /** Bump the public query namespace after a photographer-visible write. */
  async invalidateAll(): Promise<void> {
    try {
      await this.redis
        .getClient()
        .incr(PublicPhotographersQueryCache.VERSION_KEY);
    } catch (error) {
      this.logger.warn(
        `Public photographer query cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private key(version: string, operation: string, input: unknown): string {
    const serialized = JSON.stringify(input ?? {}) ?? '{}';
    const digest = createHash('sha256').update(serialized).digest('hex');
    return `${PublicPhotographersQueryCache.KEY_PREFIX}:${version}:${operation}:${digest}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
