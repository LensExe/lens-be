import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { S3ObjectService } from '@shared/integrations/s3/s3-object.service';
import type { MediaEntity } from '@shared/database/entities/media.entity';
import {
  MediaVariantType,
  type MediaVariantType as MediaVariantKind,
} from '@shared/database/entities/media-variant.entity';
import { ensure } from '@shared/platform/exceptions/domain.error';

export interface ProcessedImageVariant {
  variant: MediaVariantKind;
  file_key: string;
  file_size: number;
  content_type: 'image/webp';
  width: number;
  height: number;
}

@Injectable()
export class MediaImageProcessingService {
  constructor(private readonly objects: S3ObjectService) {}

  /**
   * Create image variants (thumbnail and preview) from the original image stored in S3.
   * - Validate the format: only JPEG, PNG, and WEBP images are supported.
   * - Read the original image's binary data (Buffer) from Object Storage through S3ObjectService.
   * - Create the THUMBNAIL variant: maximum size 400x400 (fit 'inside'), quality 75%, WebP format for quick grid and list views.
   * - Create the PREVIEW variant: maximum size 1600x1600 (fit 'inside'), quality 82%, WebP format for high-quality detail views.
   * - Return both variants with their dimensions and updated file sizes.
   *
   * @param media media data of type MediaEntity.
   * @returns List of results from the operation.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async createVariants(media: MediaEntity): Promise<ProcessedImageVariant[]> {
    ensure(
      ['image/jpeg', 'image/png', 'image/webp'].includes(media.content_type),
      'Only JPEG, PNG and WEBP images can be processed',
      'conflict',
    );

    const original = await this.objects.readBuffer({
      key: media.file_key,
    });
    ensure(original, 'Original image not found in object storage', 'invalid');

    const thumbnail = await this.createVariant(
      original,
      media.file_key,
      MediaVariantType.THUMBNAIL,
      400,
      75,
    );
    const preview = await this.createVariant(
      original,
      media.file_key,
      MediaVariantType.PREVIEW,
      1600,
      82,
    );

    return [thumbnail, preview];
  }

  /**
   * Compress, resize, and upload an image variant to S3.
   * - Use Sharp to automatically rotate the image according to its EXIF orientation (.rotate()).
   * - Resize the image to the maximum width while preserving its original aspect ratio (fit 'inside'), without enlarging smaller images (withoutEnlargement: true).
   * - Compress to the optimized WebP format using the corresponding quality setting.
   * - Set file_key to the format `${originalKey}/${variant}.webp`.
   * - Upload the processed image buffer to S3 using uploadBuffer.
   * - Return the image variant metadata (width, height, file_size, file_key, etc.).
   *
   * @param original original data of type Buffer.
   * @param originalKey Original key.
   * @param variant variant data of type MediaVariantKind.
   * @param width Numeric value used by the operation: width.
   * @param quality Numeric value used by the operation: quality.
   * @returns Result object containing the fields `variant`, `file_key`, `file_size`, `content_type`, `width`.
   */
  private async createVariant(
    original: Buffer,
    originalKey: string,
    variant: MediaVariantKind,
    width: number,
    quality: number,
  ): Promise<ProcessedImageVariant> {
    const { data, info } = await sharp(original)
      .rotate()
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    const file_key = `${originalKey}/${variant}.webp`;

    await this.objects.uploadBuffer({
      name: file_key,
      buffer: data,
      contentType: 'image/webp',
    });

    return {
      variant,
      file_key,
      file_size: info.size,
      content_type: 'image/webp',
      width: info.width,
      height: info.height,
    };
  }
}
