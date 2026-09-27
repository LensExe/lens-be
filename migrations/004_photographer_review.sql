-- Duyệt hồ sơ thợ: lưu lý do từ chối và thời điểm admin xử lý.
ALTER TABLE photographers
    ADD COLUMN rejection_reason text,
    ADD COLUMN reviewed_at timestamptz;
