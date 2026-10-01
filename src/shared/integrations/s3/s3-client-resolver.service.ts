import type { S3Client } from '@aws-sdk/client-s3';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { getActiveS3Provider } from './constants/s3';
import { requireS3ProviderConfig } from './s3.config';
import { InjectActiveS3, InjectActiveS3Presign } from './s3.decorators';

@Injectable()
export class S3ClientResolverService implements OnApplicationShutdown {
  constructor(
    @InjectActiveS3() // Equivalent to injecting the `ACTIVE_S3` token.
    private readonly active: S3Client,

    @InjectActiveS3Presign() // Equivalent to injecting the `ACTIVE_S3_PRESIGN` token.
    private readonly activePresign: S3Client,
  ) {}

  /**
   * Select the S3 client appropriate for uploading or signing a URL.
   *
   * @param presign Value used by the operation: presign.
   * @returns Result object containing the fields `client`, `config`.
   */
  resolve(presign = false) {
    const config = requireS3ProviderConfig(getActiveS3Provider());
    return {
      client: presign ? this.activePresign : this.active,
      config,
    };
  }

  /**
   * Release resources when the application shuts down.
   *
   * @returns No value is returned.
   */
  onApplicationShutdown(): void {
    this.active.destroy();
    if (this.activePresign !== this.active) this.activePresign.destroy();
  }
}
