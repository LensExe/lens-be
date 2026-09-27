-- Cho ca làm kết thúc lúc 24:00 (nửa đêm). Giờ bắt đầu vẫn tối đa 23:59.
ALTER TABLE working_hours DROP CONSTRAINT working_hours_end_time_check;
ALTER TABLE working_hours ADD CONSTRAINT working_hours_end_time_check
    CHECK(end_time ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$');
