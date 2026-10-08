import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { MediaProcessingQueue } from './media-processing.port';

/**
 * Redis queue name used to store and distribute media-processing jobs.
 * Connect the producer (`@InjectQueue`) to the consumer/worker (`@Processor`).
 */
export const MEDIA_PROCESSING_QUEUE = 'media-processing';

/**
 * Specific job type: generate image variants (thumbnail and preview).
 */
export const MEDIA_VARIANTS_JOB = 'create-variants';

/**
 * Payload passed with an image-variant generation job.
 */
export interface MediaVariantsJob {
  media_id: string;
}

/**
 * Producer service responsible for adding media-processing tasks to the BullMQ queue.
 */
@Injectable()
export class MediaProcessingQueueService extends MediaProcessingQueue {
  constructor(
    @InjectQueue(MEDIA_PROCESSING_QUEUE)
    private readonly queue: Queue<MediaVariantsJob>,
  ) {
    super();
  }

  /**
   * Enqueue an image-variant generation task for asynchronous background processing by a worker.
   * - `jobId`: Unique identifier based on mediaId to prevent duplicate jobs.
   * - `attempts: 3`: Retry up to three times if an error occurs (for example, an S3 network error).
   * - `backoff`: Exponentially increase the delay between retries, starting at 5 seconds.
   * - `removeOnComplete/removeOnFail`: Remove jobs automatically after completion or failure to save Redis memory.
   *
   * @param mediaId Media ID to process.
   * @returns No value is returned.
   */
  async enqueueVariants(mediaId: string): Promise<void> {
    await this.queue.add(
      MEDIA_VARIANTS_JOB,
      { media_id: mediaId },
      {
        jobId: `media-variants-${mediaId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
