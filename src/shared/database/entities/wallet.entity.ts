import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity đại diện cho bảng `wallets`.
 * Quản lý ví điện tử nội bộ của người dùng trên hệ thống Lens.
 */
@Entity('wallets')
export class WalletEntity extends BaseEntity {
  /** ID của người dùng sở hữu ví (khóa ngoại duy nhất liên kết `users.id`) */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Số dư khả dụng hiện tại trong ví (VND, có thể dùng để thanh toán hoặc rút) */
  @Column({ ...bigintColumn, default: 0 })
  balance!: number;

  /** Số dư đang bị đóng băng (VND, dùng trong cơ chế ký quỹ Escrow khi đang giữ cọc đơn booking) */
  @Column({ ...bigintColumn, default: 0 })
  frozen_balance!: number;
}
