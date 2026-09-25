import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Trạng thái xét duyệt / xác minh hồ sơ của Nhiếp ảnh gia
 */
export const VerificationStatus = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

/**
 * Entity đại diện cho bảng `photographers`.
 * Lưu thông tin hồ sơ nghề nghiệp và xét duyệt của Nhiếp ảnh gia (Thợ chụp ảnh).
 */
@Entity('photographers')
export class PhotographerEntity extends BaseEntity {
  /** ID người dùng (khóa ngoại duy nhất liên kết tới `users.id`) */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Mã số thuế cá nhân/doanh nghiệp của thợ chụp (nếu có) */
  @Column('text', { nullable: true })
  tax_code!: string | null;

  /** Danh sách các phong cách chụp ảnh (ví dụ: chân dung, kỷ yếu, sự kiện, cưới, ngoại cảnh...) */
  @Column('jsonb', { default: [] })
  styles!: string[];

  /** Năm bắt đầu làm nghề chụp ảnh */
  @Column({ type: 'int', nullable: true })
  started_career_at!: number | null;

  /** Địa bàn / thành phố hoạt động chính của thợ ảnh */
  @Column({ default: '' })
  location!: string;

  /** Đoạn văn bản giới thiệu bản thân, phong cách làm việc và dịch vụ */
  @Column({ default: '' })
  description!: string;

  /** Trạng thái xác thực hồ sơ nghề nghiệp bởi ban quản trị */
  @Column({ default: VerificationStatus.PENDING })
  verification_status!: VerificationStatus;

  /** Cờ boolean xác nhận đã duyệt (true khi verification_status là 'verified') */
  @Column({ default: false })
  is_verified!: boolean;

  /** ID của Quản trị viên (Admin) đã phê duyệt hồ sơ thợ ảnh này */
  @Column('uuid', { nullable: true })
  approved_by!: string | null;

  /** Lý do admin từ chối hồ sơ (null khi chưa bị từ chối hoặc đã gửi lại) */
  @Column('text', { nullable: true })
  rejection_reason!: string | null;

  /** Thời điểm admin duyệt hoặc từ chối hồ sơ gần nhất */
  @Column('timestamptz', { nullable: true, transformer: timestampTransformer })
  reviewed_at!: string | null;

  /** Trạng thái sẵn sàng nhận đơn đặt lịch (bật/tắt nhận booking) */
  @Column({ default: true })
  is_available!: boolean;
}
