-- Persist checkout expirations separately from financial transaction status.
ALTER TABLE transactions
  ADD COLUMN checkout_expires_at timestamptz,
  ADD COLUMN checkout_expired_at timestamptz,
  ADD COLUMN checkout_review_required_at timestamptz;

UPDATE transactions
SET checkout_expires_at = created_at + interval '24 hours'
WHERE status = 'pending'
  AND type = 'wallet_topup';

UPDATE transactions AS transaction
SET checkout_expires_at = LEAST(
  COALESCE(booking.accepted_at + interval '24 hours', booking.from),
  booking.from
)
FROM bookings AS booking
WHERE transaction.reference_id = booking.id
  AND transaction.status = 'pending'
  AND transaction.type = 'deposit';

CREATE INDEX transactions_checkout_expiry_idx
  ON transactions(checkout_expires_at, id)
  WHERE status = 'pending' AND checkout_expired_at IS NULL;

-- Add service deadlines and escalation markers for refunds and withdrawals.
ALTER TABLE refund_requests
  ADD COLUMN processing_due_at timestamptz,
  ADD COLUMN sla_reminded_at timestamptz,
  ADD COLUMN sla_escalated_at timestamptz,
  ADD COLUMN deadline_extension_count integer NOT NULL DEFAULT 0
    CHECK (deadline_extension_count >= 0);

UPDATE refund_requests
SET processing_due_at =
  CASE
    WHEN status = 'approved' THEN COALESCE(reviewed_at, updated_at) + interval '24 hours'
    ELSE created_at + interval '24 hours'
  END
WHERE status IN ('requested', 'approved');

CREATE INDEX refund_requests_processing_due_idx
  ON refund_requests(processing_due_at, id)
  WHERE status IN ('requested', 'approved');

-- Keep the customer refund-request cutoff separate from a later administrative escrow hold.
ALTER TABLE payment_escrow_settlements
  ADD COLUMN refund_request_deadline_at timestamptz;

UPDATE payment_escrow_settlements
SET refund_request_deadline_at = release_at;

ALTER TABLE payment_escrow_settlements
  ALTER COLUMN refund_request_deadline_at SET NOT NULL;

-- Audit explicit extensions of payment processing and escrow release deadlines.
CREATE TABLE payment_request_deadline_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES refund_requests(id),
  extended_by uuid NOT NULL REFERENCES users(id),
  previous_due_at timestamptz NOT NULL,
  new_due_at timestamptz NOT NULL,
  extension_hours integer NOT NULL CHECK (extension_hours BETWEEN 1 AND 168),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_request_deadline_extensions_request_idx
  ON payment_request_deadline_extensions(refund_request_id, created_at, id);

CREATE TABLE payment_escrow_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES payment_escrow_settlements(id),
  extended_by uuid NOT NULL REFERENCES users(id),
  previous_release_at timestamptz NOT NULL,
  new_release_at timestamptz NOT NULL,
  extension_hours integer NOT NULL CHECK (extension_hours BETWEEN 1 AND 168),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_escrow_extensions_settlement_idx
  ON payment_escrow_extensions(settlement_id, created_at, id);
