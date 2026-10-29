import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const PRESENCE_KEY_PREFIX = 'lens:presence:user:';

@Injectable()
export class PresenceClient implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceClient.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host:
        config.get<string>('AI_PRESENCE_REDIS_HOST') ??
        config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(
        config.get<string>('AI_PRESENCE_REDIS_PORT') ??
          config.get<string>('REDIS_PORT', '6379'),
      ),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      // Notification Service stores socket presence in Redis DB 1.
      db: Number(config.get<string>('AI_PRESENCE_REDIS_DB', '1')),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Presence Redis unavailable: ${error.message}`);
    });
  }

  async isOnline(userId: string): Promise<boolean> {
    if (this.redis.status === 'wait') await this.redis.connect();
    const key = `${PRESENCE_KEY_PREFIX}${userId}`;
    await this.redis.zremrangebyscore(key, '-inf', Date.now());
    return (await this.redis.zcard(key)) > 0;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit();
  }
}
