-- Booking status history: record one row for each creation or status change (actor, reason, and time).
-- `actor_role` identifies the actor; `actor_user_id` may be NULL only for a background `system` job without a user.
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

-- Existing booking: record the customer's creation event at `created_at`.
INSERT INTO booking_status_history (booking_id, from_status, to_status, actor_role, actor_user_id, created_at, updated_at)
SELECT b.id, NULL, 'pending', 'customer', c.user_id, b.created_at, b.created_at
FROM bookings b JOIN customers c ON c.id = b.customer_id;

-- For bookings that have left `pending`, the intermediate steps are unknown; record one system event for the current status at `updated_at`.
INSERT INTO booking_status_history (booking_id, from_status, to_status, actor_role, actor_user_id, reason, created_at, updated_at)
SELECT id, 'pending', status, 'system', NULL, 'Recorded when booking history was introduced', updated_at, updated_at
FROM bookings WHERE status <> 'pending';
