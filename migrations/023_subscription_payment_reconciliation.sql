-- Retry uncertain provider checkouts, retain the final admin decision, and
-- route late subscription payments through the existing refund request flow.
ALTER TABLE transactions
  ADD COLUMN checkout_reconciliation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN checkout_reconciliation_next_at timestamptz,
  ADD COLUMN checkout_review_resolution text,
  ADD COLUMN checkout_review_resolved_by uuid REFERENCES users(id),
  ADD COLUMN checkout_review_resolved_at timestamptz,
  ADD COLUMN checkout_review_resolution_reference text,
  ADD COLUMN checkout_review_resolution_note text,
  ADD CONSTRAINT transactions_checkout_reconciliation_attempts_check
    CHECK (checkout_reconciliation_attempts >= 0),
  ADD CONSTRAINT transactions_checkout_reconciliation_schedule_check
    CHECK (checkout_reconciliation_next_at IS NULL OR checkout_review_required_at IS NOT NULL),
  ADD CONSTRAINT transactions_checkout_review_resolution_check
    CHECK (
      (checkout_review_resolution IS NULL
        AND checkout_review_resolved_by IS NULL
        AND checkout_review_resolved_at IS NULL
        AND checkout_review_resolution_reference IS NULL
        AND checkout_review_resolution_note IS NULL)
      OR
      (checkout_review_resolution IN ('paid_activated', 'paid_refund', 'unpaid')
        AND checkout_review_resolved_by IS NOT NULL
        AND checkout_review_resolved_at IS NOT NULL
        AND checkout_review_resolution_note IS NOT NULL
        AND (checkout_review_resolution = 'unpaid'
          OR checkout_review_resolution_reference IS NOT NULL))
  );

-- Requeue uncertain pending payments created before bounded retries existed.
UPDATE transactions
SET checkout_reconciliation_attempts = 1,
    checkout_reconciliation_next_at = now()
WHERE status = 'pending'
  AND checkout_review_required_at IS NOT NULL
  AND provider_order_code IS NOT NULL
  AND payment_gateway IN ('payos', 'sepay');

CREATE INDEX transactions_checkout_reconciliation_due_idx
  ON transactions(checkout_reconciliation_next_at, id)
  WHERE status = 'pending'
    AND checkout_review_required_at IS NOT NULL
    AND checkout_reconciliation_next_at IS NOT NULL;

CREATE INDEX transactions_checkout_review_queue_idx
  ON transactions(checkout_review_required_at, created_at, id)
  WHERE checkout_review_required_at IS NOT NULL;

ALTER TABLE refund_requests
  ADD COLUMN subscription_id uuid REFERENCES subscriptions(id);

ALTER TABLE refund_requests
  DROP CONSTRAINT refund_requests_type_check,
  ADD CONSTRAINT refund_requests_type_check
    CHECK (request_type IN (
      'booking_cancellation', 'customer_request', 'subscription_payment', 'wallet_withdrawal'
    )),
  DROP CONSTRAINT refund_requests_source_check,
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
        AND transaction_id IS NOT NULL
        AND wallet_id IS NULL
        AND subscription_id IS NULL)
      OR
      (request_type = 'booking_cancellation'
        AND transaction_id IS NOT NULL
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

CREATE INDEX refund_requests_subscription_idx ON refund_requests(subscription_id);

-- Admin decisions are part of the append-only subscription timeline.
ALTER TABLE subscription_status_history
  DROP CONSTRAINT subscription_status_history_event_type_check,
  ADD CONSTRAINT subscription_status_history_event_type_check
    CHECK (event_type IN (
      'created', 'renewal_cancelled', 'payment_activated', 'payment_timeout',
      'payment_late_review', 'payment_reconciled', 'payment_refunded', 'expired', 'imported'
    ));

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'subscription_status_history'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%actor_role%'
  LOOP
    EXECUTE format(
      'ALTER TABLE subscription_status_history DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE subscription_status_history
  ADD CONSTRAINT subscription_status_history_actor_role_check
    CHECK (actor_role IN ('user', 'admin', 'system')),
  ADD CONSTRAINT subscription_status_history_actor_check
    CHECK ((actor_role = 'system' AND actor_user_id IS NULL)
        OR (actor_role IN ('user', 'admin') AND actor_user_id IS NOT NULL));
