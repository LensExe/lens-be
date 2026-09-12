import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `admins`.
 * Lưu trữ hồ sơ người dùng có vai trò Quản trị viên (Admin) của hệ thống.
 */
@Entity('admins')
export class AdminEntity extends BaseEntity {
  /** ID của người dùng (khóa ngoại liên kết tới bảng `users.id`) */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Trạng thái kích hoạt quyền quản trị */
  @Column({ default: true })
  is_active!: boolean;
}
