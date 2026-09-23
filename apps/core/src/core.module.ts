import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EnvModule } from '@shared/platform/env';
import { ApiRuntimeModule } from '@features/api/api-runtime.module';
import { enabledApiFeatureModules } from '@features/api/feature-modules';
import { AxiosModule } from '@shared/integrations/axios';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 60 * 1000, // 5 phút mặc định
    }),
    EnvModule,
    AxiosModule,
    ApiRuntimeModule,
    ...enabledApiFeatureModules,
  ],
})
export class CoreModule {}
