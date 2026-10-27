import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/database/redis/redis.service';

/** Short-lived Redis cache for public portfolio metadata; signed storage URLs are never stored here. */
@Injectable()
export class PublicPortfolioMetadataCache {
  private static readonly VERSION_KEY =
    'photographer:portfolios:public:version';
  private static readonly KEY_PREFIX = 'photographer:portfolios:public:v1';
  private static readonly TTL_SECONDS = 120;

  private readonly logger = new Logger(PublicPortfolioMetadataCache.name);

  constructor(private readonly redis: RedisService) {}

  /** Load one public portfolio metadata view from Redis or its database loader. */
  async getOrLoad<T>(
    view: 'list' | 'detail',
    input: unknown,
    load: () => Promise<T>,
  ): Promise<T> {
    let key: string | null = null;
    try {
      const version =
        (await this.redis.get(PublicPortfolioMetadataCache.VERSION_KEY)) ?? '0';
      key = this.key(version, view, input);
      const cached = await this.redis.getJson<T>(key);
      if (cached !== null) return cached;
    } catch (error) {
      this.logger.warn(
        `Public portfolio cache read failed: ${this.errorMessage(error)}`,
      );
    }

    const result = await load();
    if (key) {
      try {
        await this.redis.setJson(
          key,
          result,
          PublicPortfolioMetadataCache.TTL_SECONDS,
        );
      } catch (error) {
        this.logger.warn(
          `Public portfolio cache write failed: ${this.errorMessage(error)}`,
        );
      }
    }
    return result;
  }

  /** Bump the public portfolio namespace after any portfolio write commits. */
  async invalidateAll(): Promise<void> {
    try {
      await this.redis
        .getClient()
        .incr(PublicPortfolioMetadataCache.VERSION_KEY);
    } catch (error) {
      this.logger.warn(
        `Public portfolio cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private key(
    version: string,
    view: 'list' | 'detail',
    input: unknown,
  ): string {
    const serialized = JSON.stringify(input ?? {}) ?? '{}';
    const digest = createHash('sha256').update(serialized).digest('hex');
    return `${PublicPortfolioMetadataCache.KEY_PREFIX}:${version}:${view}:${digest}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
