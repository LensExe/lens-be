/** Các định dạng MIME của tập tin media được hỗ trợ. */
export const MediaContentType = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  HEIC: 'image/heic',
  MP4: 'video/mp4',
  QUICKTIME: 'video/quicktime',
} as const;

export type MediaContentType =
  (typeof MediaContentType)[keyof typeof MediaContentType];

export const ALLOWED_MEDIA_CONTENT_TYPES = [
  MediaContentType.JPEG,
  MediaContentType.PNG,
  MediaContentType.WEBP,
  MediaContentType.HEIC,
  MediaContentType.MP4,
  MediaContentType.QUICKTIME,
] as const;

export type AllowedMediaContentType =
  (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number];

/** Phạm vi truy cập của object media trên object storage. */
export const MediaVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type MediaVisibility =
  (typeof MediaVisibility)[keyof typeof MediaVisibility];

/** Trạng thái xử lý của tệp tin media. */
export const MediaStatus = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  READY: 'ready',
  DELETED: 'deleted',
} as const;

export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];
