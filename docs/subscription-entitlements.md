# Subscription entitlements

Subscription plan benefits are stored in `photographer_plans.features` as a JSONB array. New benefits use structured records so code can identify a stable code, its policy kind, its unit, and its configured value:

```json
{
  "code": "storage_limit_bytes",
  "name": "Dung lượng lưu trữ",
  "kind": "quota",
  "unit": "bytes",
  "value": "20 GB"
}
```

`code` is the API-independent identifier used by application logic. `name` is for display. `kind` describes the policy behavior. `unit` prevents values from being interpreted in the wrong dimension. `value` is kept as a string for JSON/API compatibility; quota values can be human-readable such as `20 GB`, a raw integer number of bytes, or `unlimited`.

When a subscription is purchased, its plan fields and entitlement array are copied into `subscriptions.plan_snapshot`. Active subscriptions read from that snapshot, so editing a plan later does not change an existing purchase. The demo seed updates both plan rows and its seeded subscription snapshots when re-run.

The current entitlement catalog lives in `src/shared/domain/types/plan.types.ts` and the validation and policy rules live in `src/modules/subscription/subscription.domain.ts`:

- `storage_limit_bytes` limits stored and currently reserved media. The Media module checks it before issuing an upload URL.
- `portfolio_limit` limits the number of portfolios. The Photographer module checks it before creating a portfolio.

The photographer usage endpoint reports current and remaining values for both quotas. A new entitlement should be added to the catalog, validated and interpreted by subscription policy code, enforced through a port at the owning module boundary, and then added to seed data. Display-only legacy string entries remain readable for old rows, but new structured feature codes outside the catalog are rejected when a subscription is created.
