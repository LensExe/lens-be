import { ensure } from '@shared/platform/exceptions/domain.error';

/**
 * Domain rules for media files (uploads, gallery deliveries).
 */
export class Media {
  static readonly ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
  ] as const;

  /** Maximum allowed file size: 200 MB */
  static readonly MAX_FILE_SIZE = 200 * 1024 * 1024;

  static assertAllowedContentType(contentType: string) {
    ensure(
      (Media.ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType),
      `Unsupported content type: ${contentType}`,
      'conflict',
    );
  }

  static assertFileSize(fileSize: number) {
    ensure(fileSize > 0, 'File size must be positive');
    ensure(
      fileSize <= Media.MAX_FILE_SIZE,
      `File size exceeds the 200 MB limit`,
      'conflict',
    );
  }

  static assertReady(status: string) {
    ensure(status === 'ready', 'Media is not ready', 'conflict');
  }

  static assertNotDeleted(status: string) {
    ensure(status !== 'deleted', 'Media has been deleted', 'missing');
  }

  /**
   * Validates that a gallery can still receive new items (not yet published).
   */
  static assertGalleryMutable(galleryPublishedAt: string | null) {
    ensure(!galleryPublishedAt, 'Published gallery is immutable', 'conflict');
  }

  /**
   * A gallery must contain at least one delivery item before it can be published.
   */
  static assertGalleryNotEmpty(itemCount: number) {
    ensure(itemCount > 0, 'Gallery must contain images', 'conflict');
  }

  /**
   * Media can only be published once the shoot is at least in 'shot' status.
   */
  static assertBookingReadyForPublish(status: string) {
    ensure(
      ['shot', 'completed'].includes(status),
      'Complete the shoot first',
      'conflict',
    );
  }
}
