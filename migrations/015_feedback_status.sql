-- Review có trạng thái riêng thay cho cờ is_visible: khách tự xoá và admin ẩn là hai việc khác nhau
-- (admin chỉ hiện lại được review mình đã ẩn). Review đã ẩn từ trước không biết ai ẩn nên coi là
-- admin ẩn, để admin còn tự quyết hiện lại. hidden_reason là lý do admin ẩn (null với dòng cũ).
ALTER TABLE feedbacks ADD COLUMN status text NOT NULL DEFAULT 'visible'
    CHECK(status IN ('visible','deleted_by_author','hidden_by_admin'));
ALTER TABLE feedbacks ADD COLUMN hidden_reason text;

UPDATE feedbacks SET status = 'hidden_by_admin' WHERE NOT is_visible;

DROP INDEX feedbacks_photographer_visible;
ALTER TABLE feedbacks DROP COLUMN is_visible;
CREATE INDEX feedbacks_photographer_status ON feedbacks(photographer_id, status, created_at);
