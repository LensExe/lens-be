import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import type {
  SubscriptionHistoryActorRole,
  SubscriptionHistoryEvent,
  SubscriptionStatus,
} from '@shared/domain/values/subscription.values';

/** Append-only record of subscription creation and lifecycle changes. */
@Entity('subscription_status_history')
@Index(['subscription_id', 'created_at', 'id'])
export class SubscriptionStatusHistoryEntity extends BaseEntity {
  @Column('uuid')
  subscription_id!: string;

  @Column('text')
  event_type!: SubscriptionHistoryEvent;

  @Column('text', { nullable: true })
  from_status!: SubscriptionStatus | null;

  @Column('text')
  to_status!: SubscriptionStatus;

  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  @Column('text')
  actor_role!: SubscriptionHistoryActorRole;

  @Column('uuid', { nullable: true })
  transaction_id!: string | null;

  @Column('text', { nullable: true })
  note!: string | null;
}
