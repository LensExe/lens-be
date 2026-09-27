import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  ReportStatus,
  type ReportStatus as ReportStatusType,
  type ReportTargetType,
} from '@shared/domain/values/report.values';

/**
 * Entity đại diện cho bảng `reports`.
 * Hệ thống tiếp nhận và xử lý Khiếu nại (Disputes) và Báo cáo vi phạm (Reports) tập trung.
 */
@Entity('reports')
export class ReportEntity extends BaseEntity {
  /** ID người dùng gửi báo cáo / khiếu nại (khóa ngoại liên kết `users.id`) */
  @Column('uuid')
  user_id!: string;

  /**
   * Loại đối tượng bị báo cáo / khiếu nại
   * ('booking' | 'user' | 'photographer' | 'portfolio' | 'feedback')
   */
  @Column()
  target_type!: ReportTargetType;

  /** ID của đối tượng cụ thể bị báo cáo / khiếu nại (ví dụ: booking_id, photographer_id...) */
  @Column('uuid')
  target_id!: string;

  /** Lý do / nội dung tố cáo, khiếu nại chi tiết */
  @Column('text')
  reason!: string;

  /** Danh sách ID các tệp media bằng chứng kèm theo (ảnh tin nhắn, ảnh sản phẩm lỗi...) */
  @Column('jsonb', { default: [] })
  evidence_media_ids!: string[];

  /** Trạng thái xử lý báo cáo ('open' | 'resolved' | 'rejected' | 'escalated') */
  @Column({ default: ReportStatus.OPEN })
  status!: ReportStatusType;

  /** Kết luận giải quyết hoặc hình thức xử lý của ban quản trị */
  @Column('text', { nullable: true })
  resolution!: string | null;

  /** ID của Quản trị viên đã giải quyết báo cáo này (khóa ngoại `users.id`) */
  @Column('uuid', { nullable: true })
  resolved_by!: string | null;
}
