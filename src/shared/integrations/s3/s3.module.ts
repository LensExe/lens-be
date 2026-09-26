import { Global, Module } from '@nestjs/common';
import { S3BucketService } from './s3-bucket.service';
import { S3ClientResolverService } from './s3-client-resolver.service';
import { s3ClientProviders } from './s3.providers';
import { S3ObjectService } from './s3-object.service';
import { S3ObjectStorage } from './s3-storage.service';
import { ObjectStorage } from './storage.port';

const s3Services = [S3ClientResolverService, S3ObjectService, S3BucketService];

@Global()
@Module({
  providers: [
    ...s3ClientProviders,
    ...s3Services,
    S3ObjectStorage,
    {
      // Token trừu tượng (Port) để use-cases inject mà không phụ thuộc trực tiếp vào S3
      provide: ObjectStorage,
      // Dùng alias trỏ về cùng singleton instance S3ObjectStorage ở trên, tránh tạo mới 2 instance
      useExisting: S3ObjectStorage,
    },
  ],
  exports: [
    ...s3ClientProviders,
    ...s3Services,
    ObjectStorage,
    S3ObjectStorage,
  ],
})
export class S3Module {}
