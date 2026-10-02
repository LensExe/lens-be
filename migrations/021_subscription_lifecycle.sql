-- Preserve purchase-time plan terms and record subscription lifecycle events.
ALTER TABLE subscriptions
  ADD COLUMN plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;

UPDATE subscriptions AS subscription
SET plan_snapshot = jsonb_build_object(
  'id', plan.id,
  'code', plan.code,
  'name', plan.name,
  'description', plan.description,
  'price', subscription.price,
  'billing_cycle', GREATEST(
    1,
    ROUND(EXTRACT(EPOCH FROM (subscription.end_at - subscription.start_at)) / 86400)::integer
  ),
  'features', plan.features
)
FROM photographer_plans AS plan
WHERE plan.id = subscription.plan_id;

-- Give pre-existing subscription checkouts the same reconciliation window as new ones.
UPDATE transactions
SET checkout_expires_at = created_at + interval '24 hours'
WHERE status = 'pending'
  AND type = 'subscription'
  AND checkout_expires_at IS NULL;

CREATE TABLE subscription_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'renewal_cancelled', 'payment_activated', 'payment_timeout',
    'payment_late_review', 'expired', 'imported'
  )),
  from_status text CHECK (from_status IN ('pending', 'active', 'expired', 'cancelled')),
  to_status text NOT NULL CHECK (to_status IN ('pending', 'active', 'expired', 'cancelled')),
  actor_user_id uuid REFERENCES users(id),
  actor_role text NOT NULL CHECK (actor_role IN ('user', 'system')),
  transaction_id uuid REFERENCES transactions(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((actor_role = 'system' AND actor_user_id IS NULL)
      OR (actor_role = 'user' AND actor_user_id IS NOT NULL)),
  CHECK ((event_type = 'created' AND from_status IS NULL AND to_status = 'pending')
      OR (event_type = 'imported' AND from_status IS NULL)
      OR (event_type NOT IN ('created', 'imported') AND from_status IS NOT NULL))
);

CREATE INDEX subscription_status_history_timeline_idx
  ON subscription_status_history(subscription_id, created_at DESC, id DESC);

-- Earlier transitions cannot be reconstructed; retain each subscription's current known state.
INSERT INTO subscription_status_history (
  subscription_id,
  event_type,
  from_status,
  to_status,
  actor_user_id,
  actor_role,
  note,
  created_at,
  updated_at
)
SELECT
  subscription.id,
  'imported',
  NULL,
  subscription.status,
  NULL,
  'system',
  'Imported current state; earlier subscription transitions are unavailable.',
  subscription.updated_at,
  subscription.updated_at
FROM subscriptions AS subscription;
