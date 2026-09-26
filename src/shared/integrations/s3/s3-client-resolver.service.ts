import type { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { getActiveS3Provider } from './constants/s3';
import { requireS3ProviderConfig } from './s3.config';
import { InjectActiveS3, InjectActiveS3Presign } from './s3.decorators';

@Injectable()
export class S3ClientResolverService {
  constructor(
    @InjectActiveS3() // Tương đương: @Inject(ACTIVE_S3)
    private readonly active: S3Client,

    @InjectActiveS3Presign() // Tương đương: @Inject(ACTIVE_S3_PRESIGN)
    private readonly activePresign: S3Client,
  ) {}

  resolve(presign = false) {
    const config = requireS3ProviderConfig(getActiveS3Provider());
    return {
      client: presign ? this.activePresign : this.active,
      config,
    };
  }
}
