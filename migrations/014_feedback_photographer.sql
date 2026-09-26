-- Review lưu thẳng thợ được đánh giá, để feedback lọc review theo thợ mà không phải đọc bảng bookings.
ALTER TABLE feedbacks ADD COLUMN photographer_id uuid REFERENCES photographers(id);

UPDATE feedbacks f
SET photographer_id = b.photographer_id
FROM bookings b
WHERE b.id = f.booking_id;

ALTER TABLE feedbacks ALTER COLUMN photographer_id SET NOT NULL;

CREATE INDEX feedbacks_photographer_visible ON feedbacks(photographer_id, is_visible, created_at);
