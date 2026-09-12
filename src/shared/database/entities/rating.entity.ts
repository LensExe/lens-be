import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `ratings`.
 * Tổng hợp các chỉ số đánh giá, uy tín và năng suất làm việc của Nhiếp ảnh gia.
 */
@Entity('photographer_ratings')
export class RatingEntity extends BaseEntity {
  /** ID của nhiếp ảnh gia (khóa ngoại duy nhất liên kết `photographers.id`) */
  @Column('uuid', { unique: true })
  photographer_id!: string;

  /** Điểm đánh giá trung bình (thang điểm từ 1.0 đến 5.0) */
  @Column('numeric', {
    default: 0,
    transformer: bigintColumn.transformer,
  })
  average_rating!: number;

  /** Tổng số lượt đánh giá / phản hồi đã nhận từ khách hàng */
  @Column({ default: 0 })
  total_feedbacks!: number;

  /** Tổng số đơn đặt lịch chụp đã hoàn thành */
  @Column({ default: 0 })
  total_bookings!: number;

  /** Số lượng khách hàng quay lại đặt lịch nhiều lần (tỷ lệ giữ chân khách) */
  @Column({ default: 0 })
  return_customers!: number;
}
