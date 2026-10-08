-- Keep the customer entity and the existing database schema in sync.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS description text;
