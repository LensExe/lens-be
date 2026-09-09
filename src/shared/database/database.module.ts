import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig, getMongoConfig } from './database.config';
import { RedisModule } from './redis';

@Module({
  imports: [
    // ── 1. PostgreSQL (Write DB / Command Side) ──
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getTypeOrmConfig(configService),
    }),

    // ── 2. MongoDB (Read DB / Query Side) ──
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongo = getMongoConfig(configService);
        return {
          uri: mongo.uri,
          dbName: mongo.dbName,
        };
      },
    }),

    // ── 3. Redis (In-Memory Database / Cache / PubSub) ──
    RedisModule,
  ],
  exports: [TypeOrmModule, MongooseModule, RedisModule],
})
export class DatabaseModule {}
