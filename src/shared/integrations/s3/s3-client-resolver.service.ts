import type { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { S3Provider } from './enums/s3';
import { requireS3ProviderConfig } from './s3.config';
import {
  InjectDigitalOceanS3,
  InjectDigitalOceanS3Presign,
  InjectMinioS3,
  InjectMinioS3Presign,
} from './s3.decorators';

@Injectable()
export class S3ClientResolverService {
  constructor(
    @InjectDigitalOceanS3()
    private readonly digitalOcean: S3Client,
    @InjectDigitalOceanS3Presign()
    private readonly digitalOceanPresign: S3Client,
    @InjectMinioS3()
    private readonly minio: S3Client,
    @InjectMinioS3Presign()
    private readonly minioPresign: S3Client,
  ) {}

  resolve(provider: S3Provider, presign = false) {
    const config = requireS3ProviderConfig(provider);
    const client =
      provider === S3Provider.DigitalOcean
        ? presign
          ? this.digitalOceanPresign
          : this.digitalOcean
        : presign
          ? this.minioPresign
          : this.minio;
    return { client, config };
  }
}
