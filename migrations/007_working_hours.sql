-- Giờ làm việc theo tuần của thợ (D12). Giờ theo giờ Việt Nam; thứ 1 = thứ Hai … 7 = Chủ nhật.
-- Thợ chưa có dòng nào ⇒ mặc định 08:00–20:00 mọi ngày (D14, tính trong code).
CREATE TABLE working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photographer_id uuid NOT NULL REFERENCES photographers(id),
    weekday smallint NOT NULL CHECK(weekday BETWEEN 1 AND 7),
    start_time text NOT NULL CHECK(start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    end_time text NOT NULL CHECK(end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK(start_time < end_time),
    UNIQUE(photographer_id, weekday, start_time)
);
