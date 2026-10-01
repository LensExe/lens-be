import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  bigintColumn,
  timestampTransformer,
} from './utils/column-transformers';
import { SubscriptionStatus } from '@shared/domain/values/subscription.values';
import type { SubscriptionStatus as SubscriptionStatusType } from '@shared/domain/values/subscription.values';

/**
 * Entity representing the `subscriptions` table.
 * Manages photographer memberships or subscriptions (PRO, VIP plans) on the platform.
 */
@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  /** ID of the photographer who owns the subscription (foreign key referencing `photographers.id`). */
  @Column('uuid')
  photographer_id!: string;

  /** ID of the subscribed membership plan (foreign key referencing `photographer_plans.id`). */
  @Column('uuid')
  plan_id!: string;

  /** Time when the subscription takes effect (ISO timestamptz string). */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  start_at!: string;

  /** Time when the subscription expires (ISO timestamptz string). */
  @Column('timestamptz', {
    transformer: timestampTransformer,
  })
  end_at!: string;

  /** Subscription status ('pending' | 'active' | 'expired' | 'cancelled'). */
  @Column({ default: SubscriptionStatus.PENDING })
  status!: SubscriptionStatusType;

  /** Whether to renew automatically when the current billing cycle ends. */
  @Column({ default: true })
  auto_renew!: boolean;

  /** Amount actually paid for this billing cycle (VND). */
  @Column(bigintColumn)
  price!: number;
}
