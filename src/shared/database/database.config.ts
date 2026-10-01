import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DatabaseConfig, MongoConfig } from '@shared/platform/env/types';
import { databaseEntities } from './entities';

/**
 * TypeORM configuration for the PostgreSQL connection (CQRS write model).
 *
 * @param configService config service data of type ConfigService.
 * @returns Result object containing the fields `type`, `host`, `port`, `username`, `password`.
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
    entities: databaseEntities,
    synchronize: false, // Schema changes are reviewed migrations, never auto-sync.
    logging: db?.logging ?? process.env.DB_LOGGING === 'true',
    extra: {
      max: 20, // Max connection pool
      idleTimeoutMillis: 30000,
    },
  };
};

/**
 * Redis configuration (in-memory database, cache, and Pub/Sub in the CQRS architecture).
 */
export interface RedisConfigOptions {
  host: string;
  port: number;
  password?: string;
  url: string;
}

/**
 * Build the Redis connection configuration from environment settings.
 *
 * @param configService config service data of type ConfigService.
 * @returns Result object containing the fields `host`, `port`, `password`, `url`.
 */
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
 * MongoDB configuration (CQRS read model).
 */
export interface MongoConfigOptions {
  uri: string;
  dbName: string;
}

/**
 * Build the MongoDB connection configuration from environment settings.
 *
 * @param configService config service data of type ConfigService.
 * @returns Result object containing the fields `uri`, `dbName`.
 */
export const getMongoConfig = (
  configService?: ConfigService,
): MongoConfigOptions => {
  const mongo = configService?.get<MongoConfig>('mongodb');

  return {
    uri: mongo?.uri ?? process.env.MONGODB_URI ?? '',
    dbName: mongo?.database ?? process.env.MONGODB_DATABASE ?? 'lens_read',
  };
};
