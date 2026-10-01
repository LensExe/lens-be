import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';
import {
  RefundRequestType,
  RefundStatus,
} from '@shared/domain/values/payment.values';
import { timestampTransformer } from './utils/column-transformers';
import type {
  RefundRequestType as RefundRequestTypeValue,
  RefundStatus as RefundStatusType,
} from '@shared/domain/values/payment.values';

/**
 * Entity representing the `refund_requests` table.
 * Manages outgoing payments that require approval: booking refunds, customer refund requests, and wallet withdrawals.
 */
@Entity('refund_requests')
export class RefundRequestEntity extends BaseEntity {
  /** Classifies the source of an outgoing payment so the correct refund or withdrawal workflow can be applied. */
  @Column({ default: RefundRequestType.CUSTOMER_REQUEST })
  request_type!: RefundRequestTypeValue;

  /** Transaction that collected the funds; `null` for a wallet withdrawal request. */
  @Column('uuid', { nullable: true })
  transaction_id!: string | null;

  /** Booking associated with a refund due to cancellation or a dispute. */
  @Column('uuid', { nullable: true })
  booking_id!: string | null;

  /** Source wallet for a withdrawal request. */
  @Column('uuid', { nullable: true })
  wallet_id!: string | null;

  /** ID of the user requesting the refund (foreign key referencing `users.id`). */
  @Column('uuid')
  user_id!: string;

  /** User who submitted the request; `null` for a system-generated request. */
  @Column('uuid', { nullable: true })
  requested_by!: string | null;

  /** Requested refund amount (VND). */
  @Column(bigintColumn)
  amount!: number;

  /** Reason for the refund request. */
  @Column()
  reason!: string;

  /** Amount moved from available to frozen funds to reserve an approved refund. */
  @Column({ ...bigintColumn, default: 0 })
  reserved_amount!: number;

  /** Encrypted AES-GCM recipient details; account numbers are never stored in plain text. */
  @Column('text', { nullable: true })
  payout_destination_encrypted!: string | null;

  /** Refund request status ('requested' | 'approved' | 'rejected' | 'completed'). */
  @Column({ default: RefundStatus.REQUESTED })
  status!: RefundStatusType;

  @Column('uuid', { nullable: true })
  reviewed_by!: string | null;

  @Column('timestamptz', { nullable: true })
  reviewed_at!: string | null;

  @Column('text', { nullable: true })
  rejection_reason!: string | null;

  @Column('uuid', { nullable: true })
  completed_by!: string | null;

  @Column('timestamptz', { nullable: true })
  completed_at!: string | null;

  /** Reconciliation reference returned by the bank or provider after the funds are transferred. */
  @Column('text', { nullable: true })
  payout_reference!: string | null;

  @Column('text', { nullable: true })
  idempotency_key!: string | null;

  /** Outgoing accounting transaction created when the request is completed. */
  @Column('uuid', { nullable: true })
  completed_transaction_id!: string | null;

  /** Next admin action deadline for requests still in `requested` or `approved`. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  processing_due_at!: string | null;

  /** Time the worker first notified administrators that this request missed its processing deadline. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  sla_reminded_at!: string | null;

  /** Time the worker escalated this overdue request. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  sla_escalated_at!: string | null;

  /** Number of times an administrator extended the processing deadline. */
  @Column({ type: 'integer', default: 0 })
  deadline_extension_count!: number;
}
