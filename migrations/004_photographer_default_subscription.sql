ALTER TABLE photographer_plans
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS photographer_plans_single_default_idx
  ON photographer_plans (is_default)
  WHERE is_default = true;

ALTER TABLE subscriptions
  ALTER COLUMN end_at DROP NOT NULL;
