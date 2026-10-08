-- Photographer weekly working hours (D12), in Vietnam time; day 1 is Monday through day 7, Sunday.
-- If a photographer has no working-hours rows, default to 08:00–20:00 every day (D14; applied in code).
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
