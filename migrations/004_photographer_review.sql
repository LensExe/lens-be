-- Photographer application review: store the rejection reason and the time the admin handled it.
ALTER TABLE photographers
    ADD COLUMN rejection_reason text,
    ADD COLUMN reviewed_at timestamptz;
