-- When a photographer accepts a booking, calculate the payment deadline: the customer must pay the deposit by the earlier of
-- 24 hours after acceptance or the shoot start time; on expiry, the system cancels the booking and releases the slot.
ALTER TABLE bookings ADD COLUMN accepted_at timestamptz;

-- For previously accepted bookings, use the time they entered `accepted` in the history, or `updated_at` if unavailable.
UPDATE bookings b
SET accepted_at = COALESCE(
    (SELECT max(h.created_at) FROM booking_status_history h
     WHERE h.booking_id = b.id AND h.to_status = 'accepted'),
    b.updated_at)
WHERE b.status IN ('accepted', 'in_progress', 'shot', 'completed');

CREATE INDEX bookings_awaiting_deposit ON bookings(accepted_at, "from") WHERE status = 'accepted';
