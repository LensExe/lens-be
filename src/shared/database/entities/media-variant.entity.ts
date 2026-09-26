import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

export const MediaVariantType = {
  THUMBNAIL: 'thumbnail',
  PREVIEW: 'preview',
} as const;

export type MediaVariantType =
  (typeof MediaVariantType)[keyof typeof MediaVariantType];

/**
 * Metadata for a derived image generated from the original media object.
 */
@Entity('media_variants')
@Index(['media_id', 'variant'], { unique: true })
export class MediaVariantEntity extends BaseEntity {
  @Column('uuid')
  media_id!: string;

  @Column()
  variant!: MediaVariantType;

  @Column({ unique: true })
  file_key!: string;

  @Column(bigintColumn)
  file_size!: number;

  @Column()
  content_type!: string;

  @Column('integer', { nullable: true })
  width!: number | null;

  @Column('integer', { nullable: true })
  height!: number | null;
}
