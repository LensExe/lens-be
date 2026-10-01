import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/**
 * Entity representing the `wallets` table.
 * Manages users' internal electronic wallets on the Lens platform.
 */
@Entity('wallets')
export class WalletEntity extends BaseEntity {
  /** ID of the wallet owner (unique foreign key referencing `users.id`). */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Current available wallet balance (VND; available for payment or withdrawal). */
  @Column({ ...bigintColumn, default: 0 })
  balance!: number;

  /** Frozen balance (VND; used for escrow while a booking deposit is held). */
  @Column({ ...bigintColumn, default: 0 })
  frozen_balance!: number;
}
