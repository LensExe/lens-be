-- Outbox retries: mark an event processed only after successful publishing, count attempts, and dead-letter it after the retry limit.
ALTER TABLE outbox_events
    ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    ADD COLUMN last_error text,
    ADD COLUMN failed_at timestamptz;

DROP INDEX outbox_pending;

CREATE INDEX outbox_pending
    ON outbox_events(created_at)
    WHERE processed_at IS NULL AND failed_at IS NULL;
