import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig } from './database.config';
import { UnitOfWork } from './unit-of-work/unit-of-work.port';
import { PostgresUnitOfWork } from './unit-of-work/postgres-unit-of-work';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
  ],
  providers: [
    {
      provide: UnitOfWork,
      useClass: PostgresUnitOfWork,
    },
  ],
  exports: [TypeOrmModule, UnitOfWork],
})
export class DatabaseModule {}
