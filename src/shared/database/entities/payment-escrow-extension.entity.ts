import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/** Audit record for an administrator-extended photographer payout hold. */
@Entity('payment_escrow_extensions')
@Index(['settlement_id', 'created_at'])
export class PaymentEscrowExtensionEntity extends BaseEntity {
  @Column('uuid')
  settlement_id!: string;

  @Column('uuid')
  extended_by!: string;

  @Column('timestamptz', { transformer: timestampTransformer })
  previous_release_at!: string;

  @Column('timestamptz', { transformer: timestampTransformer })
  new_release_at!: string;

  @Column('integer')
  extension_hours!: number;

  @Column('text')
  reason!: string;
}
