import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** One encrypted default payout destination per wallet owner. */
@Entity('wallet_payout_destinations')
@Index('wallet_payout_destinations_user_id_unique', ['user_id'], {
  unique: true,
})
export class WalletPayoutDestinationEntity extends BaseEntity {
  /** User who owns this payout destination. */
  @Column('uuid')
  user_id!: string;

  /** AES-GCM encrypted bank code, account number, and account name. */
  @Column('text')
  payout_destination_encrypted!: string;
}
