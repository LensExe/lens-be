import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/** Tracks the delayed release deadline for a completed booking's photographer escrow. */
@Entity('payment_escrow_settlements')
export class PaymentEscrowSettlementEntity extends BaseEntity {
  /** Booking whose collected funds are awaiting release. */
  @Column('uuid', { unique: true })
  booking_id!: string;

  /** Earliest time at which unreserved booking funds may be released. */
  @Column('timestamptz', { transformer: timestampTransformer })
  release_at!: string;

  /** Customer request cutoff remains independent from any administrator payout-hold extension. */
  @Column('timestamptz', { transformer: timestampTransformer })
  refund_request_deadline_at!: string;

  /** Time when the scheduled release pass ran; open refund amounts may remain frozen. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  release_processed_at!: string | null;
}
