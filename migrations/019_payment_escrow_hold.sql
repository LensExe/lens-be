-- Keep completed booking proceeds in escrow for 72 hours before releasing them.
CREATE TABLE payment_escrow_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  release_at timestamptz NOT NULL,
  release_processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_escrow_settlements_due_idx
  ON payment_escrow_settlements(release_at, id)
  WHERE release_processed_at IS NULL;

-- Older completed bookings were settled by the previous immediate-release flow.
-- Mark them as already processed so the new worker does not hold them again.
INSERT INTO payment_escrow_settlements (
  booking_id,
  release_at,
  release_processed_at
)
SELECT
  id,
  now() - interval '72 hours',
  now()
FROM bookings
WHERE status = 'completed'
ON CONFLICT (booking_id) DO NOTHING;
