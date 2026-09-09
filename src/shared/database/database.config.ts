import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DatabaseConfig, MongoConfig } from '@shared/platform/env/types';

/**
 * Cấu hình TypeORM kết nối PostgreSQL (Write Model trong kiến trúc CQRS)
 */
export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const db = configService.get<DatabaseConfig>('database');

  return {
    type: 'postgres',
    host: db?.host ?? process.env.DB_HOST ?? 'localhost',
    port: db?.port ?? Number.parseInt(process.env.DB_PORT ?? '5433', 10),
    username: db?.username ?? process.env.DB_USERNAME ?? 'postgres',
    password: db?.password ?? process.env.DB_PASSWORD ?? '',
    database: db?.database ?? process.env.DB_NAME ?? 'lens',
    autoLoadEntities: true,
    synchronize: db?.synchronize ?? process.env.DB_SYNCHRONIZE === 'true',
    logging: db?.logging ?? process.env.DB_LOGGING === 'true',
    extra: {
      max: 20, // Max connection pool
      idleTimeoutMillis: 30000,
    },
  };
};

/**
 * Cấu hình Redis (In-Memory Database / Cache / PubSub trong kiến trúc CQRS)
 */
export interface RedisConfigOptions {
  host: string;
  port: number;
  password?: string;
  url: string;
}

export const getRedisConfig = (
  configService?: ConfigService,
): RedisConfigOptions => {
  const host =
    configService?.get<string>('redis.host') ??
    process.env.REDIS_HOST ??
    'localhost';
  const port =
    configService?.get<number>('redis.port') ??
    Number.parseInt(process.env.REDIS_PORT ?? '6380', 10);
  const password =
    configService?.get<string>('redis.password') ??
    process.env.REDIS_PASSWORD ??
    '';

  const authPart = password ? `:${encodeURIComponent(password)}@` : '';
  const url = `redis://${authPart}${host}:${port}`;

  return {
    host,
    port,
    password: password || undefined,
    url,
  };
};

/**
 * Cấu hình MongoDB (Read Model trong kiến trúc CQRS)
 */
export interface MongoConfigOptions {
  uri: string;
  dbName: string;
}

export const getMongoConfig = (
  configService?: ConfigService,
): MongoConfigOptions => {
  const mongo = configService?.get<MongoConfig>('mongodb');

  return {
    uri: mongo?.uri ?? process.env.MONGODB_URI ?? '',
    dbName: mongo?.database ?? process.env.MONGODB_DATABASE ?? 'lens_read',
  };
};
