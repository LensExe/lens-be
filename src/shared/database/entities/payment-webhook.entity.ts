import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity đại diện cho bảng `payment_webhooks`.
 * Lưu nhật ký toàn bộ các webhook được gửi từ cổng thanh toán bên thứ ba (PayOS/VNPay)
 * phục vụ đối soát, kiểm toán và ngăn chặn tấn công replay attack (xử lý trùng lặp giao dịch).
 */
@Entity('payment_webhooks')
export class PaymentWebhookEntity extends BaseEntity {
  /** Tên cổng thanh toán gửi webhook (ví dụ: 'payos', 'vnpay') */
  @Column()
  provider!: string;

  /** Mã tham chiếu đối soát từ cổng thanh toán */
  @Column()
  reference!: string;

  /** ID của giao dịch tương ứng trong hệ thống (khóa ngoại liên kết `transactions.id`) */
  @Column('uuid')
  transaction_id!: string;
}
