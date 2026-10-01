-- A pending booking expires if the photographer does not respond: add the `expired` status
-- (unlike `rejected`, which means the photographer actively declined it). A partial index lets the expiry job scan only pending rows.
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK(status IN ('pending','accepted','rejected','cancelled','expired','in_progress','shot','completed'));

ALTER TABLE booking_status_history DROP CONSTRAINT booking_status_history_from_status_check;
ALTER TABLE booking_status_history ADD CONSTRAINT booking_status_history_from_status_check
    CHECK(from_status IN ('pending','accepted','rejected','cancelled','expired','in_progress','shot','completed'));
ALTER TABLE booking_status_history DROP CONSTRAINT booking_status_history_to_status_check;
ALTER TABLE booking_status_history ADD CONSTRAINT booking_status_history_to_status_check
    CHECK(to_status IN ('pending','accepted','rejected','cancelled','expired','in_progress','shot','completed'));

CREATE INDEX bookings_pending ON bookings(created_at, "from") WHERE status = 'pending';
