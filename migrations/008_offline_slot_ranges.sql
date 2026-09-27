-- Chặn lịch theo khoảng giờ (D12): thay cột `date` (nguyên ngày) bằng khoảng [from, to).
-- Dữ liệu cũ đổi thành nguyên ngày theo giờ Việt Nam: [00:00, 24:00) +07:00.
ALTER TABLE offline_slots
    ADD COLUMN "from" timestamptz,
    ADD COLUMN "to" timestamptz;

UPDATE offline_slots
SET "from" = date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "to" = (date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Bỏ cột `date` kéo theo UNIQUE(photographer_id, date): một ngày giờ có thể có nhiều khoảng chặn không chồng nhau.
ALTER TABLE offline_slots
    ALTER COLUMN "from" SET NOT NULL,
    ALTER COLUMN "to" SET NOT NULL,
    ADD CHECK("from" < "to"),
    DROP COLUMN date;

CREATE INDEX offline_slots_calendar
    ON offline_slots(photographer_id, "from", "to");
