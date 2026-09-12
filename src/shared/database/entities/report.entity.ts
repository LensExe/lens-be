import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Loại đối tượng bị báo cáo / khiếu nại
 */
export const ReportTargetType = {
  USER: 'user',
  BOOKING: 'booking',
  PHOTOGRAPHER: 'photographer',
  PORTFOLIO: 'portfolio',
  FEEDBACK: 'feedback',
} as const;

export type ReportTargetType =
  (typeof ReportTargetType)[keyof typeof ReportTargetType];

/**
 * Danh sách các loại đối tượng có thể bị khiếu nại / báo cáo vi phạm
 */
export const REPORT_TARGET_TYPES = [
  ReportTargetType.USER,
  ReportTargetType.BOOKING,
  ReportTargetType.PHOTOGRAPHER,
  ReportTargetType.PORTFOLIO,
  ReportTargetType.FEEDBACK,
] as const;

/**
 * Trạng thái xử lý của báo cáo vi phạm / khiếu nại
 */
export const ReportStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

/**
 * Các trạng thái báo cáo đang mở và có thể tiếp tục xử lý / giải quyết
 */
export const RESOLVABLE_REPORT_STATUSES = [
  ReportStatus.OPEN,
  ReportStatus.ESCALATED,
] as const;

export type ResolvableReportStatus =
  (typeof RESOLVABLE_REPORT_STATUSES)[number];

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
  status!: ReportStatus;

  /** Kết luận giải quyết hoặc hình thức xử lý của ban quản trị */
  @Column('text', { nullable: true })
  resolution!: string | null;

  /** ID của Quản trị viên đã giải quyết báo cáo này (khóa ngoại `users.id`) */
  @Column('uuid', { nullable: true })
  resolved_by!: string | null;
}
