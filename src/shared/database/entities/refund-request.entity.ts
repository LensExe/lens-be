import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Trạng thái của yêu cầu hoàn tiền
 */
export const RefundStatus = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

/**
 * Entity đại diện cho bảng `refund_requests`.
 * Quản lý các yêu cầu hoàn tiền của khách hàng khi hủy đơn booking hoặc có khiếu nại tranh chấp được chấp thuận.
 */
@Entity('refund_requests')
export class RefundRequestEntity extends BaseEntity {
  /** ID của giao dịch ban đầu liên quan đến khoản tiền cần hoàn (khóa ngoại `transactions.id`) */
  @Column('uuid')
  transaction_id!: string;

  /** ID của người dùng yêu cầu hoàn tiền (khóa ngoại liên kết `users.id`) */
  @Column('uuid')
  user_id!: string;

  /** Số tiền yêu cầu hoàn lại (VND) */
  @Column(bigintColumn)
  amount!: number;

  /** Lý do yêu cầu hoàn tiền */
  @Column()
  reason!: string;

  /** Trạng thái yêu cầu hoàn tiền ('requested' | 'approved' | 'rejected' | 'completed') */
  @Column({ default: RefundStatus.REQUESTED })
  status!: RefundStatus;
}
