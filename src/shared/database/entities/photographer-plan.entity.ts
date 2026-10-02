import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigintColumn } from './utils/column-transformers';
import type { PlanFeatureValue } from '@shared/domain/types/plan.types';

/**
 * Entity representing the `photographer_plans` table.
 * Defines photographer membership or subscription plans (for example, monthly or yearly PRO/VIP plans).
 */
@Entity('photographer_plans')
export class PhotographerPlanEntity extends BaseEntity {
  /** Unique membership plan identifier (for example, 'MONTHLY_PRO' or 'YEARLY_VIP'). */
  @Column({ unique: true })
  code!: string;

  /** Membership plan name. */
  @Column()
  name!: string;

  /** Detailed description of membership benefits. */
  @Column('text', { nullable: true })
  description!: string | null;

  /** Subscription price (VND). */
  @Column(bigintColumn)
  price!: number;

  /** Whether the plan is currently available for purchase. */
  @Column({ default: true })
  is_active!: boolean;

  /** Billing cycle in days (for example, 30 or 365 days). */
  @Column()
  billing_cycle!: number;

  /**
   * Membership features or privileges, stored directly as a JSONB array.
   */
  @Column('jsonb', { default: [] })
  features!: PlanFeatureValue[];
}
