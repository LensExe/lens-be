import { Module } from '@nestjs/common';
import { ApiModule } from '@features/api/api.module';

@Module({
  imports: [ApiModule],
  controllers: [],
  providers: [],
})
export class CoreModule {}
