import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Các định dạng MIME của tập tin media được hỗ trợ trong hệ thống
 */
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

/**
 * Danh sách toàn bộ các MIME types hợp lệ được phép tải lên
 */
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

/**
 * Trạng thái xử lý của tệp tin media
 */
export const MediaStatus = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const;

export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];

/** Phạm vi truy cập của object media trên object storage. */
export const MediaVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type MediaVisibility =
  (typeof MediaVisibility)[keyof typeof MediaVisibility];

/**
 * Entity đại diện cho bảng `media`.
 * Lưu trữ thông tin metadata của tất cả các tập tin tải lên hệ thống (ảnh đại diện, album ảnh, bằng chứng tranh chấp...).
 */
@Entity('media')
export class MediaEntity extends BaseEntity {
  /** ID của người dùng sở hữu tập tin tải lên (khóa ngoại liên kết `users.id`) */
  @Column('uuid')
  user_id!: string;

  /** Đường dẫn / định danh duy nhất của tệp tin trên dịch vụ lưu trữ đám mây (S3 Key) */
  @Column({ unique: true })
  file_key!: string;

  /** Dung lượng tập tin (bytes), tự động ép kiểu sang dạng số number */
  @Column(bigintColumn)
  file_size!: number;

  /** Định dạng MIME của tập tin (ví dụ: 'image/jpeg', 'image/png', 'image/webp') */
  @Column()
  content_type!: MediaContentType;

  /** Private mặc định; public object phải được bucket policy cho phép đọc. */
  @Column({ default: MediaVisibility.PRIVATE })
  visibility!: MediaVisibility;

  /** Trạng thái xử lý của tệp tin. */
  @Column({ default: MediaStatus.PENDING })
  status!: MediaStatus;
}
