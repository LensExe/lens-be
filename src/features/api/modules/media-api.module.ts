import { Module } from '@nestjs/common';
import { MediaController } from '../http/media.controller';
import {
  MediaAddGalleryCommandHandler,
  MediaCompleteCommandHandler,
  MediaCreateGalleryCommandHandler,
  MediaPublishCommandHandler,
  MediaRemoveCommandHandler,
  MediaUploadCommandHandler,
} from '@modules/media/media.command';
import {
  MediaDownloadQueryHandler,
  MediaGalleryQueryHandler,
  MediaGetQueryHandler,
} from '@modules/media/media.query';

@Module({
  controllers: [MediaController],
  providers: [
    MediaAddGalleryCommandHandler,
    MediaCompleteCommandHandler,
    MediaCreateGalleryCommandHandler,
    MediaPublishCommandHandler,
    MediaRemoveCommandHandler,
    MediaUploadCommandHandler,
    MediaDownloadQueryHandler,
    MediaGalleryQueryHandler,
    MediaGetQueryHandler,
  ],
})
export class MediaApiModule {}
