import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MediaController } from '../http/media.controller';
import {
  MediaAddGalleryCommandHandler,
  MediaCompleteCommandHandler,
  MediaCreateGalleryCommandHandler,
  MediaExpirePendingUploadsCommandHandler,
  MediaPublishCommandHandler,
  MediaRemoveCommandHandler,
  MediaUploadCommandHandler,
} from '@modules/media/media.command';
import {
  MediaDownloadQueryHandler,
  MediaGalleryQueryHandler,
  MediaGetQueryHandler,
} from '@modules/media/media.query';
import { MediaVariantsProcessor } from '@modules/media/queue/media.processor';
import {
  MEDIA_PROCESSING_QUEUE,
  MediaProcessingQueueService,
} from '@modules/media/queue/media.queue';
import { MediaProcessingQueue } from '@modules/media/queue/media-processing.port';
import { MediaPendingUploadExpiryJob } from '../../workers/media-pending-upload-expiry.job';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  controllers: [MediaController],
  providers: [
    MediaAddGalleryCommandHandler,
    MediaCompleteCommandHandler,
    MediaCreateGalleryCommandHandler,
    MediaExpirePendingUploadsCommandHandler,
    MediaPublishCommandHandler,
    MediaRemoveCommandHandler,
    MediaUploadCommandHandler,
    MediaDownloadQueryHandler,
    MediaGalleryQueryHandler,
    MediaGetQueryHandler,
    MediaProcessingQueueService,
    MediaVariantsProcessor,
    MediaPendingUploadExpiryJob,
    {
      provide: MediaProcessingQueue,
      useExisting: MediaProcessingQueueService,
    },
  ],
})
export class MediaApiModule {}
