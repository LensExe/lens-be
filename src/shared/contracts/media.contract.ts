export interface MediaUploadCommandInput {
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  file_size: number;
}

export interface MediaCompleteCommandInput {
  media_id: string;
}

export interface MediaGetQueryInput {
  id: string;
}

export interface MediaDownloadQueryInput {
  id: string;
}

export interface MediaRemoveCommandInput {
  id: string;
}

export interface MediaCreateGalleryCommandInput {
  id: string;
}

export interface MediaGalleryQueryInput {
  id: string;
}

export interface MediaAddGalleryCommandInput {
  id: string;
  media_id: string;
}

export interface MediaPublishCommandInput {
  id: string;
}
