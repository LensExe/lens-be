import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/** Default cache TTL (ms): 5 minutes. */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory cache (separate for each instance), registered once for the whole application.
 *
 * Modules can inject `CACHE_MANAGER` from `@nestjs/cache-manager` without importing it again.
 * Use for data that can be lost and does not need to be consistent across all instances.
 * Use `RedisService` (`../redis`) for data shared across instances.
 */
@Global()
@Module({
  imports: [CacheModule.register({ ttl: DEFAULT_CACHE_TTL_MS })],
  exports: [CacheModule],
})
export class LensCacheModule {}
