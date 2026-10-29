/** Values that subscription policy code knows how to interpret and enforce. */
export const SubscriptionFeatureCode = {
  STORAGE_LIMIT_BYTES: 'storage_limit_bytes',
  PORTFOLIO_LIMIT: 'portfolio_limit',
} as const;

export type SubscriptionFeatureCode =
  (typeof SubscriptionFeatureCode)[keyof typeof SubscriptionFeatureCode];

/** A typed subscription entitlement. `value` stays a string for JSON/API compatibility. */
export interface PlanFeature {
  code: SubscriptionFeatureCode;
  name: string;
  kind: 'quota';
  unit: 'bytes' | 'portfolios';
  value: string;
}

/** Legacy seeded plans store their feature keys as strings. */
export type PlanFeatureValue = PlanFeature | string;

/** Terms copied onto a subscription so later plan edits do not change an active purchase. */
export interface PhotographerPlanSnapshot {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: number;
  features: PlanFeatureValue[];
}
