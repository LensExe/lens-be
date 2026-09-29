import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { EntitySchemas, MediaStatus, updateEntity } from '@shared/database';
import { MediaImageProcessingService } from '../media-image-processing.service';
import {
  MEDIA_PROCESSING_QUEUE,
  MEDIA_VARIANTS_JOB,
  type MediaVariantsJob,
} from './media.queue';

@Injectable()
@Processor(MEDIA_PROCESSING_QUEUE)
export class MediaVariantsProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaVariantsProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly imageProcessing: MediaImageProcessingService,
  ) {
    super();
  }

  async process(job: Job<MediaVariantsJob>): Promise<void> {
    if (job.name !== MEDIA_VARIANTS_JOB) return;

    const media = await this.dataSource.manager.findOneBy(EntitySchemas.media, {
      id: job.data.media_id,
    });

    // media không tồn tại
    if (!media || media.status === MediaStatus.DELETED) return;
    // media đã xử lý xong
    if (media.status === MediaStatus.READY) return;
    // media không phải là UPLOADED, FAILED, PROCESSING -> return
    if (
      media.status !== MediaStatus.UPLOADED &&
      media.status !== MediaStatus.FAILED &&
      media.status !== MediaStatus.PROCESSING
    )
      return;

    await updateEntity(this.dataSource.manager, EntitySchemas.media, media.id, {
      status: MediaStatus.PROCESSING,
    });

    try {
      const variants = await this.imageProcessing.createVariants(media);

      await this.dataSource.transaction(async (s) => {
        await s.delete(EntitySchemas.media_variants, {
          media_id: media.id,
        });
        await s.save(
          EntitySchemas.media_variants,
          variants.map((variant) => ({ ...variant, media_id: media.id })),
        );
        await updateEntity(s, EntitySchemas.media, media.id, {
          status: MediaStatus.READY,
        });
      });
    } catch (error) {
      await updateEntity(
        this.dataSource.manager,
        EntitySchemas.media,
        media.id,
        { status: MediaStatus.FAILED },
      );
      this.logger.error(
        `Media variants processing failed for ${media.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
