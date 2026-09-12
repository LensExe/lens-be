import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Giới tính người dùng
 */
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

/**
 * Trạng thái tài khoản người dùng
 */
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * Entity đại diện cho bảng `users`.
 * Bảng tài khoản người dùng cốt lõi của toàn bộ hệ thống Lens Backend.
 */
@Entity('users')
export class UserEntity extends BaseEntity {
  /** ID định danh người dùng trên Keycloak (khóa duy nhất dùng để xác thực JWT) */
  @Column({ unique: true })
  keycloak_id!: string;

  /** Họ và tên đầy đủ của người dùng */
  @Column()
  fullname!: string;

  /** Địa chỉ email của người dùng */
  @Column()
  email!: string;

  /** Số điện thoại liên hệ */
  @Column('text', { nullable: true })
  phone_number!: string | null;

  /** Đường dẫn URL hình ảnh đại diện */
  @Column('text', { nullable: true })
  avatar_url!: string | null;

  /** Giới tính người dùng ('male' | 'female' | 'other') */
  @Column('text', { nullable: true })
  gender!: Gender | null;

  /** Ngày tháng năm sinh (định dạng YYYY-MM-DD) */
  @Column({ type: 'date', nullable: true })
  dob!: string | null;

  /** Trạng thái tài khoản người dùng ('active' | 'suspended' | 'banned' | 'inactive') */
  @Column({ default: UserStatus.INACTIVE })
  status!: UserStatus;
}
