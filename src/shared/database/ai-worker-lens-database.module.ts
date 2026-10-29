import {
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EnvModule } from '@shared/platform/env';

export const AI_WORKER_LENS_DATA_SOURCE = 'AI_WORKER_LENS_DATA_SOURCE';

@Injectable()
class AiWorkerLensDatabaseShutdown implements OnApplicationShutdown {
  constructor(
    @Inject(AI_WORKER_LENS_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }
}

/**
 * Read connection used only by the AI worker to load canonical Lens context.
 * It is intentionally separate from the core application's TypeORM module.
 */
@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: AI_WORKER_LENS_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSource> => {
        const dataSource = new DataSource({
          type: 'postgres',
          host:
            process.env.AI_SOURCE_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
          port: Number(
            process.env.AI_SOURCE_DB_PORT ?? process.env.DB_PORT ?? '5433',
          ),
          username:
            process.env.AI_SOURCE_DB_USERNAME ??
            process.env.DB_USERNAME ??
            'postgres',
          password:
            process.env.AI_SOURCE_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
          database:
            process.env.AI_SOURCE_DB_NAME ?? process.env.DB_NAME ?? 'lens',
          synchronize: false,
          logging: config.get<string>('AI_SOURCE_DB_LOGGING') === 'true',
          entities: [],
          extra: {
            max: Number(config.get<string>('AI_SOURCE_DB_POOL_MAX', '5')),
            idleTimeoutMillis: 30_000,
          },
        });

        return dataSource.initialize();
      },
    },
    AiWorkerLensDatabaseShutdown,
  ],
  exports: [AI_WORKER_LENS_DATA_SOURCE],
})
export class AiWorkerLensDatabaseModule {}
