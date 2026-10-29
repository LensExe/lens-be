import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/** Immutable ledger recording every change to available and held balances. */
@Entity('wallet_ledger')
@Index('wallet_ledger_wallet_created_idx', ['wallet_id', 'created_at', 'id'])
export class WalletLedgerEntity extends BaseEntity {
  @Column('uuid')
  wallet_id!: string;

  @Column('uuid', { nullable: true })
  transaction_id!: string | null;

  @Column('uuid', { nullable: true })
  refund_request_id!: string | null;

  @Column()
  entry_type!: string;

  @Column(bigintColumn)
  available_delta!: number;

  @Column(bigintColumn)
  frozen_delta!: number;

  @Column({ unique: true })
  idempotency_key!: string;

  @Column('text', { default: '' })
  description!: string;
}
