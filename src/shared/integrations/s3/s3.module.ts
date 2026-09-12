import { Global, Module } from '@nestjs/common';
import { S3BucketService } from './s3-bucket.service';
import { S3BuildService } from './s3-build.service';
import { S3ClientResolverService } from './s3-client-resolver.service';
import { S3CopyService } from './s3-copy.service';
import { S3DeleteService } from './s3-delete.service';
import { s3ClientProviders } from './s3.providers';
import { S3ReadService } from './s3-read.service';
import { S3ObjectStorage } from './s3-storage.service';
import { S3UploadService } from './s3-upload.service';
import { ObjectStorage } from './storage.port';

const s3Services = [
  S3ClientResolverService,
  S3UploadService,
  S3ReadService,
  S3BuildService,
  S3BucketService,
  S3CopyService,
  S3DeleteService,
];

@Global()
@Module({
  providers: [
    ...s3ClientProviders,
    ...s3Services,
    S3ObjectStorage,
    { provide: ObjectStorage, useExisting: S3ObjectStorage },
  ],
  exports: [
    ...s3ClientProviders,
    ...s3Services,
    ObjectStorage,
    S3ObjectStorage,
  ],
})
export class S3Module {}
