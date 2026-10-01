-- The UUID PRIMARY KEY `id` column had no DEFAULT. On PostgreSQL, TypeORM's `@PrimaryGeneratedColumn('uuid')`
-- adds a DEFAULT and expects the database to generate the ID, so inserts that omit it otherwise fail with a null ID.
-- `gen_random_uuid()` is available in PostgreSQL 13; no extension is required.
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE customers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE admins ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE photographers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE photographer_ratings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE booking_plans ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE photographer_plans ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE offline_slots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE wallets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE payment_webhooks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE refund_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE media ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE portfolios ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE booking_deliveries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE feedbacks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE reports ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE outbox_events ALTER COLUMN id SET DEFAULT gen_random_uuid();
