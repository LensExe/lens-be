-- Block calendar time ranges (D12): replace the full-day `date` column with the half-open interval [from, to).
-- Convert existing data to a full Vietnam-time day: [00:00, 24:00) +07:00.
ALTER TABLE offline_slots
    ADD COLUMN "from" timestamptz,
    ADD COLUMN "to" timestamptz;

UPDATE offline_slots
SET "from" = date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "to" = (date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Dropping `date` also removes UNIQUE(photographer_id, date), allowing multiple non-overlapping blocked intervals on one day.
ALTER TABLE offline_slots
    ALTER COLUMN "from" SET NOT NULL,
    ALTER COLUMN "to" SET NOT NULL,
    ADD CHECK("from" < "to"),
    DROP COLUMN date;

CREATE INDEX offline_slots_calendar
    ON offline_slots(photographer_id, "from", "to");
