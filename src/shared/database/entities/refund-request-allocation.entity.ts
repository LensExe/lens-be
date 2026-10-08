import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';

/** Amount of a booking-level refund request assigned to one paid transaction. */
@Entity('refund_request_allocations')
@Index(['refund_request_id', 'transaction_id'], { unique: true })
@Index(['transaction_id'])
export class RefundRequestAllocationEntity extends BaseEntity {
  @Column('uuid')
  refund_request_id!: string;

  @Column('uuid')
  transaction_id!: string;

  @Column(bigintColumn)
  amount!: number;

  /** Amount newly reserved from the photographer's available balance at approval. */
  @Column({ ...bigintColumn, default: 0 })
  reserved_amount!: number;

  /** Outgoing accounting transaction written when this allocation is completed. */
  @Column('uuid', { nullable: true })
  completed_transaction_id!: string | null;
}
