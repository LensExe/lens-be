/** Configuration for a membership plan feature or privilege. */
export interface PlanFeature {
  code: string;
  name: string;
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
