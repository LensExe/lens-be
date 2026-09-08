import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get('database') ?? {};
        return {
          type: 'postgres',
          host: db.host ?? 'localhost',
          port: db.port ?? 5432,
          username: db.username ?? 'postgres',
          password: db.password ?? '',
          database: db.database ?? 'lens_db',
          autoLoadEntities: true,
          synchronize: db.synchronize ?? false,
          logging: db.logging ?? false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
