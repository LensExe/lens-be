-- Booking pending mà thợ không trả lời thì hết hạn: thêm trạng thái `expired`
-- (khác `rejected` là thợ chủ động từ chối). Index một phần cho job hết hạn chỉ đọc các dòng pending.
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
