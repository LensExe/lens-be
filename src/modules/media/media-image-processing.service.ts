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
   * Tạo các biến thể ảnh (thumbnail và preview) từ file ảnh gốc trên S3.
   * - Kiểm tra định dạng hợp lệ: Chỉ hỗ trợ xử lý các định dạng ảnh JPEG, PNG và WEBP.
   * - Đọc dữ liệu nhị phân (Buffer) của ảnh gốc từ Object Storage thông qua S3ObjectService.
   * - Tạo biến thể THUMBNAIL: Kích thước tối đa 400x400 (fit 'inside'), chất lượng 75%, định dạng WebP dùng hiển thị lưới/danh sách nhanh.
   * - Tạo biến thể PREVIEW: Kích thước tối đa 1600x1600 (fit 'inside'), chất lượng 82%, định dạng WebP dùng xem chi tiết chất lượng cao.
   * - Trả về danh sách gồm 2 biến thể kèm thông tin kích thước và dung lượng mới.
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
   * Xử lý nén, đổi kích thước một biến thể ảnh và tải lên S3.
   * - Dùng thư viện Sharp để tự động xoay ảnh theo EXIF orientation (.rotate()).
   * - Resize kích thước ảnh theo chiều rộng tối đa, giữ nguyên tỉ lệ gốc (fit 'inside'), không phóng to ảnh nhỏ (withoutEnlargement: true).
   * - Nén sang định dạng tối ưu WebP với mức chất lượng (quality) tương ứng.
   * - Đặt file_key theo cấu trúc `${originalKey}/${variant}.webp`.
   * - Tải buffer ảnh đã xử lý lên S3 bằng uploadBuffer.
   * - Trả về metadata của ảnh biến thể (width, height, file_size, file_key...).
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
