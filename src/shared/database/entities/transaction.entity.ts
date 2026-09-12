import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Các loại giao dịch trong hệ thống
 */
export const TransactionType = {
  DEPOSIT: 'deposit',
  REMAINING: 'remaining',
  SUBSCRIPTION: 'subscription',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

/**
 * Các loại thực thể tham chiếu gắn liền với giao dịch
 */
export const TransactionReferenceType = {
  BOOKING: 'booking',
  SUBSCRIPTION: 'subscription',
  WALLET_TOPUP: 'wallet_topup',
  WALLET_WITHDRAWAL: 'wallet_withdrawal',
  REFUND: 'refund',
} as const;

export type TransactionReferenceType =
  (typeof TransactionReferenceType)[keyof typeof TransactionReferenceType];

/**
 * Entity đại diện cho bảng `transactions`.
 * Quản lý toàn bộ lịch sử biến động số dư và các giao dịch nạp, rút,
 * thanh toán qua cổng trực tuyến (PayOS) hoặc nội bộ.
 */
@Entity('transactions')
export class TransactionEntity extends BaseEntity {
  /** ID người dùng thực hiện hoặc thụ hưởng giao dịch (khóa ngoại liên kết `users.id`) */
  @Column('uuid')
  user_id!: string;

  /** Mã giao dịch hiển thị duy nhất trong hệ thống (ví dụ: 'TXN-20261020-001') */
  @Column({ unique: true })
  transaction_code!: string;

  /** Loại giao dịch ('deposit', 'remaining', 'subscription') */
  @Column()
  type!: TransactionType;

  /** Loại tham chiếu ('booking' | 'subscription' | 'wallet_topup' | 'wallet_withdrawal' | 'refund') */
  @Column('varchar', { nullable: true })
  referrence_type!: TransactionReferenceType | null;

  /** ID của thực thể liên quan (ví dụ: booking_id, subscription_id...) */
  @Column('uuid', { nullable: true })
  reference_id!: string | null;

  /** Chiều dòng tiền: 'in' (tiền vào) hoặc 'out' (tiền ra) */
  @Column({ default: 'in' })
  direction!: string;

  /** Số tiền giao dịch (VND) */
  @Column(bigintColumn)
  amount!: number;

  /** Loại tiền tệ sử dụng (mặc định: 'VND') */
  @Column({ default: 'VND' })
  currency!: string;

  /** Nội dung / Diễn giải giao dịch (ví dụ: 'Đặt cọc đơn chụp ảnh #123') */
  @Column('text', { default: '' })
  description!: string;

  /** Trạng thái giao dịch ('pending' | 'success' | 'failed' | 'cancelled') */
  @Column({ default: 'pending' })
  status!: string;

  /** Cổng thanh toán xử lý ('payos' | 'wallet_internal' | 'bank_transfer') */
  @Column({ default: 'payos' })
  payment_gateway!: string;

  /** Mã đơn hàng đối soát từ cổng thanh toán bên thứ ba (cho phép null với giao dịch nội bộ) */
  @Column({ ...bigintColumn, nullable: true })
  provider_order_code!: number | null;

  /** Đường dẫn trang thanh toán PayOS chuyển hướng khách hàng */
  @Column('text', { nullable: true })
  checkout_url!: string | null;

  /** Chuỗi mã VietQR thanh toán nhanh */
  @Column('text', { nullable: true })
  qr_code!: string | null;

  /** Khóa Idempotency tránh tạo trùng lặp giao dịch khi click nhiều lần */
  @Column()
  idempotency_key!: string;
}
