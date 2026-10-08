export type SubscriptionUsageQueryInput = Record<string, never>;

export type SubscriptionMeQueryInput = Record<string, never>;

export type SubscriptionHistoryQueryInput = Record<string, never>;

export type SubscriptionPlansQueryInput = Record<string, never>;

export interface SubscriptionCreateCommandInput {
  photographer_plan_id: string;
  idempotency_key: string;
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
