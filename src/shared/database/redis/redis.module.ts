import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { getRedisConfig } from '../database.config';
import { REDIS_CLIENT } from './redis.constants';
import { RedisClient, RedisService } from './redis.service';

const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<RedisClient> => {
    const logger = new Logger('RedisModule');
    const { url } = getRedisConfig(configService);

    const client: RedisClient = createClient({ url });

    client.on('error', (err) => {
      logger.error(`❌ Redis connection error: ${err.message}`);
    });

    client.on('connect', () => {
      logger.log(`🚀 Redis connected successfully`);
    });

    try {
      await client.connect();
    } catch (err) {
      logger.error(
        `⚠️ Failed to connect to Redis on startup. Please ensure Redis container is running!`,
        err,
      );
    }

    return client;
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisClientProvider, RedisService],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisModule.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: any,
  ) {}

  public async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Closing Redis connection due to application shutdown (${signal})...`,
    );
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}
