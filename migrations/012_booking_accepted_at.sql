-- Lúc thợ nhận booking, để tính hạn thanh toán: khách phải trả cọc trước mốc tới trước
-- (24 giờ sau khi nhận, hoặc lúc bắt đầu chụp); quá hạn thì system huỷ và nhả lịch.
ALTER TABLE bookings ADD COLUMN accepted_at timestamptz;

-- Booking đã nhận từ trước: lấy lúc chuyển sang accepted trong lịch sử, không có thì updated_at.
UPDATE bookings b
SET accepted_at = COALESCE(
    (SELECT max(h.created_at) FROM booking_status_history h
     WHERE h.booking_id = b.id AND h.to_status = 'accepted'),
    b.updated_at)
WHERE b.status IN ('accepted', 'in_progress', 'shot', 'completed');

CREATE INDEX bookings_awaiting_deposit ON bookings(accepted_at, "from") WHERE status = 'accepted';
