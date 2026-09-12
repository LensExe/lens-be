import { Module } from '@nestjs/common';
import { ApiRuntimeModule } from './api-runtime.module';
import { enabledApiFeatureModules } from './feature-modules';
import { EnvModule } from '@shared/platform/env';

@Module({
  imports: [EnvModule, ApiRuntimeModule, ...enabledApiFeatureModules],
})
export class ApiModule {}
