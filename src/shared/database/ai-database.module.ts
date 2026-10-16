import {
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { DatabaseConfig } from '@shared/platform/env/types';
import { EnvModule } from '@shared/platform/env';

export const AI_DATABASE_DATA_SOURCE = 'AI_DATABASE_DATA_SOURCE';

@Injectable()
class AiDatabaseShutdown implements OnApplicationShutdown {
  constructor(
    @Inject(AI_DATABASE_DATA_SOURCE) private readonly dataSource: DataSource,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: AI_DATABASE_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSource> => {
        const primary = config.get<DatabaseConfig>('database');
        const databaseUrl = process.env.AI_DATABASE_URL;
        const dataSource = new DataSource({
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host:
                  process.env.AI_DB_HOST ??
                  primary?.host ??
                  process.env.DB_HOST ??
                  'localhost',
                port: Number(
                  process.env.AI_DB_PORT ??
                    primary?.port ??
                    process.env.DB_PORT ??
                    '5433',
                ),
                username:
                  process.env.AI_DB_USERNAME ??
                  primary?.username ??
                  process.env.DB_USERNAME ??
                  'lens-postgres',
                password:
                  process.env.AI_DB_PASSWORD ??
                  primary?.password ??
                  process.env.DB_PASSWORD ??
                  '',
                database: process.env.AI_DB_NAME ?? 'lens_ai',
              }),
          synchronize: false,
          logging: process.env.AI_DB_LOGGING === 'true',
          entities: [],
          extra: {
            max: Number(process.env.AI_DB_POOL_MAX ?? '10'),
            idleTimeoutMillis: 30_000,
          },
        });

        return dataSource.initialize();
      },
    },
    AiDatabaseShutdown,
  ],
  exports: [AI_DATABASE_DATA_SOURCE],
})
export class AiDatabaseModule {}
