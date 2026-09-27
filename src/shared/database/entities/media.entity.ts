import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';
import { MediaStatus } from '@shared/domain/values/media.values';
import type {
  MediaContentType,
  MediaStatus as MediaStatusType,
} from '@shared/domain/values/media.values';

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

  /** Trạng thái xử lý của tệp tin ('pending' | 'uploaded' | 'ready' | 'deleted') */
  @Column({ default: MediaStatus.PENDING })
  status!: MediaStatusType;
}
