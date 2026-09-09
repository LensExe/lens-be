import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObjectStorage } from './storage.port';
import { S3ObjectStorage } from './s3-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    S3ObjectStorage,
    {
      provide: ObjectStorage,
      useClass: S3ObjectStorage,
    },
  ],
  exports: [ObjectStorage, S3ObjectStorage],
})
export class StorageModule {}
