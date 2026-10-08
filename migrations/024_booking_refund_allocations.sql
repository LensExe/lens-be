-- A booking refund is one request with one or more paid transaction allocations.
CREATE TABLE refund_request_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES refund_requests(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  amount bigint NOT NULL CHECK (amount > 0),
  reserved_amount bigint NOT NULL DEFAULT 0
    CHECK (reserved_amount >= 0 AND reserved_amount <= amount),
  completed_transaction_id uuid REFERENCES transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (refund_request_id, transaction_id)
);

-- Preserve allocations for existing one-transaction booking refund requests.
INSERT INTO refund_request_allocations (
  refund_request_id,
  transaction_id,
  amount,
  reserved_amount,
  completed_transaction_id,
  created_at,
  updated_at
)
SELECT
  request.id,
  request.transaction_id,
  request.amount,
  request.reserved_amount,
  request.completed_transaction_id,
  request.created_at,
  request.updated_at
FROM refund_requests AS request
WHERE request.request_type IN ('booking_cancellation', 'customer_request')
  AND request.booking_id IS NOT NULL
  AND request.transaction_id IS NOT NULL
ON CONFLICT (refund_request_id, transaction_id) DO NOTHING;

ALTER TABLE refund_requests
  DROP CONSTRAINT refund_requests_source_check,
  ALTER COLUMN transaction_id DROP NOT NULL;

-- Booking requests now point to their source payments through allocations only.
UPDATE refund_requests
SET transaction_id = NULL
WHERE request_type IN ('booking_cancellation', 'customer_request')
  AND booking_id IS NOT NULL;

ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_source_check
    CHECK (
      (request_type = 'wallet_withdrawal'
        AND wallet_id IS NOT NULL
        AND transaction_id IS NULL
        AND booking_id IS NULL
        AND subscription_id IS NULL
        AND payout_destination_encrypted IS NOT NULL)
      OR
      (request_type = 'customer_request'
        AND wallet_id IS NULL
        AND subscription_id IS NULL
        AND ((transaction_id IS NOT NULL) OR booking_id IS NOT NULL))
      OR
      (request_type = 'booking_cancellation'
        AND booking_id IS NOT NULL
        AND wallet_id IS NULL
        AND subscription_id IS NULL)
      OR
      (request_type = 'subscription_payment'
        AND transaction_id IS NOT NULL
        AND booking_id IS NULL
        AND subscription_id IS NOT NULL
        AND wallet_id IS NULL)
    );

CREATE INDEX refund_request_allocations_request_idx
  ON refund_request_allocations(refund_request_id, transaction_id);
CREATE INDEX refund_request_allocations_transaction_idx
  ON refund_request_allocations(transaction_id, refund_request_id);
