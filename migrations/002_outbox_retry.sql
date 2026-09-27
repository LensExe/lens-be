-- Outbox retry: chỉ đánh dấu processed khi publish thành công, đếm số lần thử, dead-letter khi quá hạn.
ALTER TABLE outbox_events
    ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    ADD COLUMN last_error text,
    ADD COLUMN failed_at timestamptz;

DROP INDEX outbox_pending;

CREATE INDEX outbox_pending
    ON outbox_events(created_at)
    WHERE processed_at IS NULL AND failed_at IS NULL;
