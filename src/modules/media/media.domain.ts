import { ensure } from '@shared/domain/domain.error';
import {
  ALLOWED_MEDIA_CONTENT_TYPES,
  MediaContentType,
  MediaStatus,
  MediaVisibility,
} from '@shared/domain/values/media.values';
import { BookingStatus } from '@shared/domain/values/booking.values';

export { MediaContentType, ALLOWED_MEDIA_CONTENT_TYPES, MediaStatus };

/**
 * Domain rules for media files (uploads, gallery deliveries).
 */
export class Media {
  static readonly ALLOWED_CONTENT_TYPES = ALLOWED_MEDIA_CONTENT_TYPES;

  /** Maximum allowed file size: 200 MB */
  static readonly MAX_FILE_SIZE = 200 * 1024 * 1024;

  /**
   * Check whether the file content type is in the allowed list.
   *
   * @param contentType Content type.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertAllowedContentType(contentType: string) {
    ensure(
      (Media.ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType),
      `Unsupported content type: ${contentType}`,
      'conflict',
    );
  }

  /**
   * Check whether the file size is within the allowed limit.
   *
   * @param fileSize File size.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static assertFileSize(fileSize: number) {
    ensure(fileSize > 0, 'File size must be positive');
    ensure(
      fileSize <= Media.MAX_FILE_SIZE,
      `File size exceeds the 200 MB limit`,
      'conflict',
    );
  }

  /**
   * Check whether media is ready for the next operation.
   *
   * @param status Current status or target status.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertReady(status: string) {
    ensure(status === MediaStatus.READY, 'Media is not ready', 'conflict');
  }

  /**
   * Check that media has not been deleted before continuing.
   *
   * @param status Current status or target status.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  static assertNotDeleted(status: string) {
    ensure(status !== MediaStatus.DELETED, 'Media has been deleted', 'missing');
  }

  /**
   * Validates that a gallery can still receive new items (not yet published).
   *
   * @param galleryPublishedAt Value used by the operation: gallery published at.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertGalleryMutable(galleryPublishedAt: string | null) {
    ensure(!galleryPublishedAt, 'Published gallery is immutable', 'conflict');
  }

  /**
   * A gallery must contain at least one delivery item before it can be published.
   *
   * @param itemCount Numeric value used by the operation: item count.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertGalleryNotEmpty(itemCount: number) {
    ensure(itemCount > 0, 'Gallery must contain images', 'conflict');
  }

  /** A delivery gallery must meet the photo count promised by the booking's package. */
  static assertGalleryMeetsPhotoCount(
    itemCount: number,
    requiredCount: number,
  ) {
    ensure(
      Number.isSafeInteger(requiredCount) && requiredCount > 0,
      'Booking package photo count is invalid',
      'conflict',
    );
    ensure(
      itemCount >= requiredCount,
      `Gallery must contain at least ${requiredCount} photos`,
      'conflict',
    );
  }

  /** Customers may only receive a gallery after the booking has been fully paid. */
  static assertBookingFullyPaid(paidAmount: number, totalAmount: number) {
    ensure(
      paidAmount >= totalAmount,
      'Booking must be fully paid before the gallery can be published',
      'conflict',
    );
  }

  /** Delivery media must remain private until the paid gallery is published. */
  static assertPrivateDeliveryMedia(visibility: string) {
    ensure(
      visibility === MediaVisibility.PRIVATE,
      'Booking delivery photos must use private visibility',
      'conflict',
    );
  }

  /**
   * Media can only be published once the shoot is at least in 'shot' status.
   *
   * @param status Current status or target status.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertBookingReadyForPublish(status: string) {
    ensure(
      status === BookingStatus.SHOT || status === BookingStatus.COMPLETED,
      'Complete the shoot first',
      'conflict',
    );
  }
}
