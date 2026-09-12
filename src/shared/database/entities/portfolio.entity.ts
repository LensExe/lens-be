import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `portfolios`.
 * Bộ sưu tập / album tác phẩm của Nhiếp ảnh gia để trưng bày năng lực với khách hàng.
 */
@Entity('portfolios')
export class PortfolioEntity extends BaseEntity {
  /** ID của nhiếp ảnh gia sở hữu bộ sưu tập (khóa ngoại liên kết `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** Tên của bộ sưu tập / album (ví dụ: 'Ảnh cưới Đà Lạt', 'Chân dung Retro') */
  @Column()
  name!: string;

  /** Thể loại / phong cách chụp của album (ví dụ: 'wedding', 'portrait', 'yearbook', 'event') */
  @Column({ nullable: true })
  category!: string;

  /** Mô tả về bộ sưu tập tác phẩm */
  @Column({ default: '' })
  description!: string;

  /** ID của tệp media được chọn làm ảnh bìa cho album (khóa ngoại liên kết `media.id`) */
  @Column('uuid', { nullable: true })
  cover_media_id!: string | null;

  /**
   * Danh sách ID của các tấm ảnh trong album (mảng UUID).
   * Ví dụ: ["uuid-anh-1", "uuid-anh-2", "uuid-anh-3"]
   */
  @Column('jsonb', { default: [] })
  items!: string[];
}
