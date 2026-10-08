import type { MediaVisibility } from '@shared/domain/values/media.values';

export interface MediaUploadCommandInput {
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  file_size: number;
  /** Private by default if the client does not provide a value. */
  visibility?: MediaVisibility;
}

export interface MediaCompleteCommandInput {
  media_id: string;
}

export interface MediaGetQueryInput {
  media_id: string;
}

export interface MediaDownloadQueryInput {
  booking_id: string;
}

export interface MediaRemoveCommandInput {
  media_id: string;
}

export interface MediaCreateGalleryCommandInput {
  booking_id: string;
}

export interface MediaGalleryQueryInput {
  booking_id: string;
}

export interface MediaAddGalleryCommandInput {
  booking_id: string;
  media_id: string;
}

export interface MediaPublishCommandInput {
  booking_id: string;
}
