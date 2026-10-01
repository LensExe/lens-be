import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `portfolios` table.
 * Collection or album of a photographer's work, showcasing their skills to customers.
 */
@Entity('portfolios')
export class PortfolioEntity extends BaseEntity {
  /** ID of the photographer who owns the portfolio (foreign key referencing `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** Portfolio or album name (for example, 'Da Lat Wedding Photos' or 'Retro Portraits'). */
  @Column()
  name!: string;

  /** Album genre or photography style (for example, 'wedding', 'portrait', 'yearbook', or 'event'). */
  @Column({ nullable: true })
  category!: string;

  /** Description of the portfolio. */
  @Column({ default: '' })
  description!: string;

  /** ID of the media file selected as the album cover (foreign key referencing `media.id`). */
  @Column('uuid', { nullable: true })
  cover_media_id!: string | null;

  /**
   * List of image IDs in the album (UUID array).
   * For example: ["image-uuid-1", "image-uuid-2", "image-uuid-3"].
   */
  @Column('jsonb', { default: [] })
  items!: string[];
}
