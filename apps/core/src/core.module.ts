import { Module } from '@nestjs/common';
import { EnvModule } from '@shared/platform/env';
import { DatabaseModule } from '@shared/database';
import { ApiRuntimeModule } from '@features/api/api-runtime.module';
import { enabledApiFeatureModules } from '@features/api/feature-modules';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    ApiRuntimeModule,
    ...enabledApiFeatureModules,
  ],
})
export class CoreModule {}
