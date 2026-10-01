import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';
import {
  TransactionDirection,
  TransactionPaymentGateway,
  TransactionStatus,
  type TransactionDirection as TransactionDirectionType,
  type TransactionPaymentGateway as TransactionPaymentGatewayType,
  type TransactionStatus as TransactionStatusType,
  type TransactionType,
} from '@shared/domain/values/payment.values';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity representing the `transactions` table.
 * Stores incoming and outgoing payments created in Lens, including bookings, subscriptions, wallet top-ups,
 * refunds, and provider or internal wallet withdrawals.
 */
@Entity('transactions')
export class TransactionEntity extends BaseEntity {
  /** ID of the user who performed or benefited from the transaction (foreign key referencing `users.id`). */
  @Column('uuid')
  user_id!: string;

  /** Unique transaction code displayed in the system (for example, 'TXN-20261020-001'). */
  @Column({ unique: true })
  transaction_code!: string;

  /** Transaction type: booking, subscription, wallet top-up, refund, or wallet withdrawal. */
  @Column()
  type!: TransactionType;

  /** ID of the related entity (for example, `booking_id` or `subscription_id`). */
  @Column('uuid', { nullable: true })
  reference_id!: string | null;

  /** Direction of funds: 'in' or 'out'. */
  @Column({ default: TransactionDirection.IN })
  direction!: TransactionDirectionType;

  /** Transaction amount (VND). */
  @Column(bigintColumn)
  amount!: number;

  /** Currency used (default: 'VND'). */
  @Column({ default: 'VND' })
  currency!: string;

  /** Transaction description (for example, 'Deposit for photo shoot #123'). */
  @Column('text', { default: '' })
  description!: string;

  /** Transaction status ('pending' | 'paid' | 'failed'). */
  @Column({ default: TransactionStatus.PENDING })
  status!: TransactionStatusType;

  /** Payment provider or method used to record the outgoing payment. */
  @Column({ default: TransactionPaymentGateway.PAYOS })
  payment_gateway!: TransactionPaymentGatewayType;

  /** Reconciliation order code from a third-party payment gateway (`null` is allowed for internal transactions). */
  @Column({ ...bigintColumn, nullable: true })
  provider_order_code!: number | null;

  /** Provider checkout URL, if available. */
  @Column('text', { nullable: true })
  checkout_url!: string | null;

  /** QR payment payload or image URL. */
  @Column('text', { nullable: true })
  qr_code!: string | null;

  /** Local checkout deadline; this does not determine whether money was received. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  checkout_expires_at!: string | null;

  /** Time the local checkout was marked expired by the expiry worker. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  checkout_expired_at!: string | null;

  /** Time an operator must reconcile a checkout whose provider cannot be queried automatically. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  checkout_review_required_at!: string | null;

  /** Idempotency key to prevent duplicate transactions when a request is submitted multiple times. */
  @Column()
  idempotency_key!: string;
}
