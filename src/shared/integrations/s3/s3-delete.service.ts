import { ChecksumAlgorithm, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { S3_DELETE_BATCH_SIZE } from './constants/s3';
import { S3ClientResolverService } from './s3-client-resolver.service';
import type { DeleteObjectsParams } from './types/delete';

@Injectable()
export class S3DeleteService {
  constructor(private readonly resolver: S3ClientResolverService) {}

  async deleteObjects(params: DeleteObjectsParams): Promise<number> {
    if (params.keys.length === 0) return 0;
    const { client, config } = this.resolver.resolve(params.provider);
    let deleted = 0;
    for (
      let offset = 0;
      offset < params.keys.length;
      offset += S3_DELETE_BATCH_SIZE
    ) {
      const keys = params.keys.slice(offset, offset + S3_DELETE_BATCH_SIZE);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          ChecksumAlgorithm: ChecksumAlgorithm.MD5,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
      deleted += keys.length;
    }
    return deleted;
  }
}
