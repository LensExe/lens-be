import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/database/redis/redis.service';

export type PhotographerCatalog = 'ranks' | 'badges';

/** Shared cache for the public rank and badge definition catalogs. */
@Injectable()
export class PhotographerCatalogCache {
  private static readonly KEY_PREFIX = 'photographer:catalog:v1';
  private static readonly TTL_SECONDS = 3600;

  private readonly logger = new Logger(PhotographerCatalogCache.name);

  constructor(private readonly redis: RedisService) {}

  /** Return a cached catalog or load and cache it from the database. */
  async getOrLoad<T>(catalog: PhotographerCatalog, load: () => Promise<T>) {
    const key = `${PhotographerCatalogCache.KEY_PREFIX}:${catalog}`;
    try {
      const cached = await this.redis.getJson<T>(key);
      if (cached !== null) return cached;
    } catch (error) {
      this.logger.warn(
        `Photographer ${catalog} catalog cache read failed: ${this.errorMessage(error)}`,
      );
    }

    const result = await load();
    try {
      await this.redis.setJson(
        key,
        result,
        PhotographerCatalogCache.TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Photographer ${catalog} catalog cache write failed: ${this.errorMessage(error)}`,
      );
    }
    return result;
  }

  /** Remove one catalog after its admin update transaction commits. */
  async invalidate(catalog: PhotographerCatalog): Promise<void> {
    try {
      await this.redis.del(`${PhotographerCatalogCache.KEY_PREFIX}:${catalog}`);
    } catch (error) {
      this.logger.warn(
        `Photographer ${catalog} catalog cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
