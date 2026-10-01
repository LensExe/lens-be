-- Extend payment transactions for wallet funding, refund and withdrawal entries.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'remaining', 'subscription', 'wallet_topup', 'refund', 'withdrawal'));

ALTER TABLE transactions ALTER COLUMN reference_id DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN provider_order_code DROP NOT NULL;

-- Only booking and subscription intents are unique by reference/type. A wallet can have
-- multiple top-ups, withdrawals and refunds over its lifetime.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_reference_id_type_key;
CREATE UNIQUE INDEX transactions_reference_type_intent_uq
  ON transactions(reference_id, type)
  WHERE type IN ('deposit', 'remaining', 'subscription');

ALTER TABLE refund_requests ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE refund_requests
  ADD COLUMN request_type text NOT NULL DEFAULT 'customer_request',
  ADD COLUMN booking_id uuid REFERENCES bookings(id),
  ADD COLUMN wallet_id uuid REFERENCES wallets(id),
  ADD COLUMN requested_by uuid REFERENCES users(id),
  ADD COLUMN reserved_amount bigint NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
  ADD COLUMN payout_destination_encrypted text,
  ADD COLUMN reviewed_by uuid REFERENCES users(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN rejection_reason text,
  ADD COLUMN completed_by uuid REFERENCES users(id),
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN payout_reference text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN completed_transaction_id uuid REFERENCES transactions(id);

-- Preserve booking context for legacy refund rows created before booking_id/type existed.
UPDATE refund_requests AS request
SET
  booking_id = booking.id,
  request_type = CASE
    WHEN booking.status IN ('cancelled', 'rejected', 'expired')
      THEN 'booking_cancellation'
    ELSE 'customer_request'
  END
FROM transactions AS tx
JOIN bookings AS booking ON booking.id = tx.reference_id
WHERE request.transaction_id = tx.id
  AND tx.type IN ('deposit', 'remaining');

ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_type_check
    CHECK (request_type IN ('booking_cancellation', 'customer_request', 'wallet_withdrawal')),
  ADD CONSTRAINT refund_requests_status_check
    CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  ADD CONSTRAINT refund_requests_reserved_amount_check
    CHECK (reserved_amount <= amount),
  ADD CONSTRAINT refund_requests_source_check
    CHECK (
      (request_type = 'wallet_withdrawal'
        AND wallet_id IS NOT NULL
        AND transaction_id IS NULL
        AND booking_id IS NULL
        AND payout_destination_encrypted IS NOT NULL)
      OR
      (request_type = 'customer_request'
        AND transaction_id IS NOT NULL
        AND wallet_id IS NULL)
      OR
      (request_type = 'booking_cancellation'
        AND transaction_id IS NOT NULL
        AND booking_id IS NOT NULL
        AND wallet_id IS NULL)
    );

CREATE INDEX refund_requests_status_created_idx
  ON refund_requests(status, created_at DESC, id DESC);
CREATE INDEX refund_requests_booking_idx ON refund_requests(booking_id);
CREATE INDEX refund_requests_wallet_idx ON refund_requests(wallet_id);
CREATE UNIQUE INDEX refund_requests_user_idempotency_uq
  ON refund_requests(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Older accounts created before wallet initialization still need a wallet row.
INSERT INTO wallets (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Immutable audit trail for all wallet balance and escrow movements.
CREATE TABLE wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  transaction_id uuid REFERENCES transactions(id),
  refund_request_id uuid REFERENCES refund_requests(id),
  entry_type text NOT NULL,
  available_delta bigint NOT NULL DEFAULT 0,
  frozen_delta bigint NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_delta <> 0 OR frozen_delta <> 0)
);

CREATE INDEX wallet_ledger_wallet_created_idx
  ON wallet_ledger(wallet_id, created_at, id);
CREATE INDEX wallet_ledger_transaction_idx
  ON wallet_ledger(transaction_id)
  WHERE transaction_id IS NOT NULL;
CREATE INDEX wallet_ledger_refund_request_idx
  ON wallet_ledger(refund_request_id)
  WHERE refund_request_id IS NOT NULL;

-- Preserve pre-existing wallet snapshots as opening ledger balances so the
-- ledger remains useful immediately after rollout.
INSERT INTO wallet_ledger (
  wallet_id,
  entry_type,
  available_delta,
  frozen_delta,
  idempotency_key,
  description
)
SELECT
  id,
  'opening_balance',
  balance,
  frozen_balance,
  'migration-wallet-opening:' || id::text,
  'Wallet snapshot carried forward when the immutable ledger was introduced'
FROM wallets
WHERE balance <> 0 OR frozen_balance <> 0
ON CONFLICT (idempotency_key) DO NOTHING;
