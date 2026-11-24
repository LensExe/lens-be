import type { PlanFeatureValue } from '@shared/domain/types/plan.types';

export type SubscriptionUsageQueryInput = Record<string, never>;

export type SubscriptionMeQueryInput = Record<string, never>;

export type SubscriptionHistoryQueryInput = Record<string, never>;

export type SubscriptionPlansQueryInput = Record<string, never>;

export type SubscriptionAdminPlansQueryInput = Record<string, never>;

export interface SubscriptionPlanCreateCommandInput {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  billing_cycle: number;
  features?: PlanFeatureValue[];
  is_active?: boolean;
  is_default?: boolean;
}

export interface SubscriptionPlanUpdateCommandInput {
  plan_id: string;
  code?: string;
  name?: string;
  description?: string | null;
  price?: number;
  billing_cycle?: number;
  features?: PlanFeatureValue[];
  is_active?: boolean;
  is_default?: boolean;
}

export interface SubscriptionCreateCommandInput {
  photographer_plan_id: string;
  idempotency_key: string;
  payment_method?: 'gateway' | 'wallet';
}

export interface SubscriptionCancelCommandInput {
  subscription_id: string;
}

export interface SubscriptionWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
}

export interface SubscriptionPaymentReviewResolutionInput {
  subscription_payment_id: string;
  outcome: 'activate' | 'refund' | 'unpaid';
  note: string;
  provider_reference?: string;
}
