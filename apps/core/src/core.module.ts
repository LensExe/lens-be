import { Module } from '@nestjs/common';
import { EnvModule } from '@shared/platform/env';
import { DatabaseModule } from '@shared/database';
import { ApiModule } from '@features/api/api.module';

@Module({
  imports: [EnvModule, DatabaseModule, ApiModule],
  controllers: [],
  providers: [],
})
export class CoreModule {}
