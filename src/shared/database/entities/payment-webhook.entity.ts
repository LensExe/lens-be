import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `payment_webhooks` table.
 * Stores logs for all webhooks sent by third-party payment gateways (PayOS/VNPay)
 * for reconciliation, auditing, and protection against replay attacks (duplicate transaction processing).
 */
@Entity('payment_webhooks')
export class PaymentWebhookEntity extends BaseEntity {
  /** Payment gateway that sent the webhook (for example, 'payos' or 'vnpay'). */
  @Column()
  provider!: string;

  /** Reconciliation reference from the payment gateway. */
  @Column()
  reference!: string;

  /** ID of the corresponding system transaction (foreign key referencing `transactions.id`). */
  @Column('uuid')
  transaction_id!: string;
}
