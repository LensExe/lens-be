import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  bigintColumn,
  timestampTransformer,
} from './utils/column-transformers';

/**
 * Trạng thái của gói thuê bao / hội viên
 */
export const SubscriptionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

/**
 * Entity đại diện cho bảng `subscriptions`.
 * Quản lý gói hội viên / thuê bao (gói PRO, VIP) của Nhiếp ảnh gia trên nền tảng.
 */
@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  /** ID của nhiếp ảnh gia sở hữu gói thuê bao (khóa ngoại liên kết `photographers.id`) */
  @Column('uuid')
  photographer_id!: string;

  /** ID của gói cước hội viên đăng ký (khóa ngoại liên kết `photographer_plans.id`) */
  @Column('uuid')
  plan_id!: string;

  /** Thời điểm gói thuê bao bắt đầu có hiệu lực (ISO timestamptz string) */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  start_at!: string;

  /** Thời điểm gói thuê bao hết hạn (ISO timestamptz string) */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  end_at!: string;

  /** Trạng thái gói cước ('pending' | 'active' | 'expired' | 'cancelled') */
  @Column({ default: SubscriptionStatus.PENDING })
  status!: SubscriptionStatus;

  /** Cho phép tự động gia hạn khi đến hạn kết thúc chu kỳ */
  @Column({ default: true })
  auto_renew!: boolean;

  /** Số tiền cước phí thực tế thanh toán cho chu kỳ này (VND) */
  @Column(bigintColumn)
  price!: number;
}
