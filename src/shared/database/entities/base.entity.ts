import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { timestampTransformer } from './utils/column-transformers';

/**
 * BaseEntity là lớp trừu tượng (abstract class) cơ sở cho tất cả các Entity trong cơ sở dữ liệu.
 * Tự động cung cấp 3 trường chuẩn:
 * - `id`: Khóa chính UUID tự sinh.
 * - `created_at`: Thời gian tạo bản ghi (được chuẩn hóa sang ISO string qua timestampTransformer).
 * - `updated_at`: Thời gian cập nhật bản ghi gần nhất.
 */
export abstract class BaseEntity {
  /** Khóa chính định danh duy nhất của bản ghi (UUID v4) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Thời điểm bản ghi được tạo ra trong CSDL */
  @CreateDateColumn({
    type: 'timestamptz',
    transformer: timestampTransformer,
  })
  created_at!: string;

  /** Thời điểm bản ghi được cập nhật lần cuối */
  @UpdateDateColumn({
    type: 'timestamptz',
    transformer: timestampTransformer,
  })
  updated_at!: string;
}
