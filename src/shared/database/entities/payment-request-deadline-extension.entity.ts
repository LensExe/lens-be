import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/** Audit record for an administrator-extended refund or withdrawal processing deadline. */
@Entity('payment_request_deadline_extensions')
@Index(['refund_request_id', 'created_at'])
export class PaymentRequestDeadlineExtensionEntity extends BaseEntity {
  @Column('uuid')
  refund_request_id!: string;

  @Column('uuid')
  extended_by!: string;

  @Column('timestamptz', { transformer: timestampTransformer })
  previous_due_at!: string;

  @Column('timestamptz', { transformer: timestampTransformer })
  new_due_at!: string;

  @Column('integer')
  extension_hours!: number;

  @Column('text')
  reason!: string;
}
