import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/** TTL mặc định của cache (ms): 5 phút. */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cache in-memory (riêng từng instance), đăng ký một lần cho toàn ứng dụng.
 *
 * Module nào cần thì inject `CACHE_MANAGER` từ `@nestjs/cache-manager`, không cần import lại.
 * Dùng cho dữ liệu mất được và không cần mọi instance thấy giống nhau.
 * Dữ liệu phải dùng chung giữa các instance thì dùng `RedisService` (`../redis`).
 */
@Global()
@Module({
  imports: [CacheModule.register({ ttl: DEFAULT_CACHE_TTL_MS })],
  exports: [CacheModule],
})
export class LensCacheModule {}
