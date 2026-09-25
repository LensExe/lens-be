import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `outbox_events`.
 * Cốt lõi của kiến trúc Transactional Outbox Pattern:
 * Lưu các sự kiện cần gửi (thông báo realtime, socket, webhook...) trong cùng database transaction với nghiệp vụ chính,
 * đảm bảo dữ liệu không bao giờ bị mất (Guaranteed Delivery) trước khi OutboxWorker quét và gửi đi.
 */
@Entity('outbox_events')
export class OutboxEventEntity extends BaseEntity {
  /** Tên chủ đề / sự kiện (ví dụ: 'booking.created', 'payment.success') */
  @Column()
  topic!: string;

  /** Danh sách ID người dùng nhận sự kiện (user_id) */
  @Column('jsonb')
  recipient_ids!: string[];

  /** Dữ liệu chi tiết của sự kiện đi kèm */
  @Column('jsonb')
  payload!: Record<string, unknown>;

  /** Thời điểm worker đã xử lý phát sự kiện thành công (null nghĩa là chưa xử lý) */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  processed_at!: string | null;

  /** Số lần worker đã thử publish mà thất bại */
  @Column('integer', { default: 0 })
  attempts!: number;

  /** Thông báo lỗi của lần publish thất bại gần nhất */
  @Column('text', { nullable: true })
  last_error!: string | null;

  /** Thời điểm bỏ cuộc sau khi thất bại quá số lần cho phép (dead-letter); worker không lấy lại nữa */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  failed_at!: string | null;
}
