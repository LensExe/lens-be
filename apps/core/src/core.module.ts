import { Module } from '@nestjs/common';
import { EnvModule } from '@shared/platform/env';
import { ApiRuntimeModule } from '@features/api/api-runtime.module';
import { enabledApiFeatureModules } from '@features/api/feature-modules';
import { AxiosModule } from '@shared/integrations/axios';

@Module({
  imports: [
    EnvModule,
    AxiosModule,
    ApiRuntimeModule,
    ...enabledApiFeatureModules,
  ],
})
export class CoreModule {}
