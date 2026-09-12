export type SubscriptionUsageQueryInput = Record<string, never>;

export type SubscriptionMeQueryInput = Record<string, never>;

export type SubscriptionPlansQueryInput = Record<string, never>;

export interface SubscriptionCreateCommandInput {
  plan_id: string;
  idempotency_key: string;
}

export interface SubscriptionCancelCommandInput {
  id: string;
}

export interface SubscriptionWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
}
