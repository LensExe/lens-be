import { Module } from '@nestjs/common';
import { ApiRuntimeModule } from './api-runtime.module';
import { enabledApiFeatureModules } from './feature-modules';

@Module({
  imports: [ApiRuntimeModule, ...enabledApiFeatureModules],
})
export class ApiModule {}
