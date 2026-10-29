import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';
import {
  MediaStatus,
  MediaVisibility,
} from '@shared/domain/values/media.values';
import type {
  MediaContentType,
  MediaStatus as MediaStatusType,
  MediaVisibility as MediaVisibilityType,
} from '@shared/domain/values/media.values';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity representing the `media` table.
 * Stores metadata for all files uploaded to the system (profile images, photo albums, dispute evidence, etc.).
 */
@Entity('media')
export class MediaEntity extends BaseEntity {
  /** ID of the user who owns the uploaded file (foreign key referencing `users.id`). */
  @Column('uuid')
  user_id!: string;

  /** Unique path or identifier for the file in cloud storage (S3 key). */
  @Column({ unique: true })
  file_key!: string;

  /** File size in bytes, automatically converted to a number. */
  @Column(bigintColumn)
  file_size!: number;

  /** File MIME type (for example, 'image/jpeg', 'image/png', or 'image/webp'). */
  @Column()
  content_type!: MediaContentType;

  /** Private by default; public objects must be readable under the bucket policy. */
  @Column({ default: MediaVisibility.PRIVATE })
  visibility!: MediaVisibilityType;

  /** Processing status of the file. */
  @Column({ default: MediaStatus.PENDING })
  status!: MediaStatusType;

  /** Deadline of the current presigned upload reservation; null after completion. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  upload_expires_at!: string | null;
}
