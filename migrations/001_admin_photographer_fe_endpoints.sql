ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT
  '{"booking_updates":true,"messages":true,"promotions":false,"email_digest":false}'::jsonb;

ALTER TABLE booking_plans
  ADD COLUMN IF NOT EXISTS delivery_days integer;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_plans_delivery_days_check'
  ) THEN
    ALTER TABLE booking_plans
      ADD CONSTRAINT booking_plans_delivery_days_check
      CHECK (delivery_days IS NULL OR delivery_days BETWEEN 1 AND 365);
  END IF;
END $$;
