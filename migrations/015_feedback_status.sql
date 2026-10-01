-- Reviews have their own status instead of an `is_visible` flag: customer deletion and admin hiding are different actions
-- (an admin can restore only a review they hid). For older hidden reviews, the hider is unknown, so treat them as
-- admin-hidden to let an admin decide whether to restore them. `hidden_reason` records the admin's reason (`null` for old rows).
ALTER TABLE feedbacks ADD COLUMN status text NOT NULL DEFAULT 'visible'
    CHECK(status IN ('visible','deleted_by_author','hidden_by_admin'));
ALTER TABLE feedbacks ADD COLUMN hidden_reason text;

UPDATE feedbacks SET status = 'hidden_by_admin' WHERE NOT is_visible;

DROP INDEX feedbacks_photographer_visible;
ALTER TABLE feedbacks DROP COLUMN is_visible;
CREATE INDEX feedbacks_photographer_status ON feedbacks(photographer_id, status, created_at);
