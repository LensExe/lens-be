-- Lịch sử trạng thái booking: mỗi lần tạo / chuyển trạng thái ghi 1 dòng (ai làm, lý do, lúc nào).
-- actor_role cho biết bên nào làm; actor_user_id chỉ được NULL khi actor_role = 'system' (job nền không gắn user).
CREATE TABLE booking_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id),
    from_status text CHECK(from_status IN ('pending','accepted','rejected','cancelled','in_progress','shot','completed')),
    to_status text NOT NULL CHECK(to_status IN ('pending','accepted','rejected','cancelled','in_progress','shot','completed')),
    actor_role text NOT NULL CHECK(actor_role IN ('customer','photographer','admin','system')),
    actor_user_id uuid REFERENCES users(id),
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK(actor_user_id IS NOT NULL OR actor_role = 'system')
);
CREATE INDEX booking_status_history_booking ON booking_status_history(booking_id, created_at);

-- Booking có sẵn: dòng tạo booking do khách làm, lúc created_at.
INSERT INTO booking_status_history (booking_id, from_status, to_status, actor_role, actor_user_id, created_at, updated_at)
SELECT b.id, NULL, 'pending', 'customer', c.user_id, b.created_at, b.created_at
FROM bookings b JOIN customers c ON c.id = b.customer_id;

-- Booking đã rời pending: không biết các bước giữa chừng, ghi 1 dòng tới trạng thái hiện tại do system, lúc updated_at.
INSERT INTO booking_status_history (booking_id, from_status, to_status, actor_role, actor_user_id, reason, created_at, updated_at)
SELECT id, 'pending', status, 'system', NULL, 'Recorded when booking history was introduced', updated_at, updated_at
FROM bookings WHERE status <> 'pending';
