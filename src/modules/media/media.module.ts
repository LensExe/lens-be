import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MediaUseCases } from './application/media';
import {
  MediaUploadCommandHandler,
  MediaCompleteCommandHandler,
  MediaCreateGalleryCommandHandler,
  MediaAddGalleryCommandHandler,
  MediaPublishCommandHandler,
  MediaRemoveCommandHandler,
} from './application/commands/media';
import {
  MediaGetQueryHandler,
  MediaGalleryQueryHandler,
  MediaDownloadQueryHandler,
} from './application/queries/media';

const CommandHandlers = [
  MediaUploadCommandHandler,
  MediaCompleteCommandHandler,
  MediaCreateGalleryCommandHandler,
  MediaAddGalleryCommandHandler,
  MediaPublishCommandHandler,
  MediaRemoveCommandHandler,
];

const QueryHandlers = [
  MediaGetQueryHandler,
  MediaGalleryQueryHandler,
  MediaDownloadQueryHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [MediaUseCases, ...CommandHandlers, ...QueryHandlers],
  exports: [MediaUseCases],
})
export class MediaModule {}
