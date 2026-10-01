import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';

/**
 * Entity representing the `outbox_events` table.
 * Core of the Transactional Outbox Pattern:
 * Save events to dispatch (real-time notifications, sockets, webhooks, etc.) in the same database transaction as the primary operation,
 * ensuring they are not lost before OutboxWorker retrieves and dispatches them (guaranteed delivery).
 */
@Entity('outbox_events')
export class OutboxEventEntity extends BaseEntity {
  /** Event topic or name (for example, 'booking.created' or 'payment.success'). */
  @Column()
  topic!: string;

  /** IDs of users who receive the event (`user_id`). */
  @Column('jsonb')
  recipient_ids!: string[];

  /** Event payload. */
  @Column('jsonb')
  payload!: Record<string, unknown>;

  /** Time when a worker successfully dispatched the event (`null` means it has not been processed). */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  processed_at!: string | null;

  /** Number of failed publish attempts by workers. */
  @Column('integer', { default: 0 })
  attempts!: number;

  /** Error from the most recent failed publish attempt. */
  @Column('text', { nullable: true })
  last_error!: string | null;

  /** Time when the event was abandoned after exceeding the retry limit (dead letter); workers will not pick it up again. */
  @Column('timestamptz', {
    nullable: true,
    transformer: timestampTransformer,
  })
  failed_at!: string | null;
}
