-- Earned photographer badges (D13): permanent, with one row per badge per photographer.
CREATE TABLE photographer_badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photographer_id uuid NOT NULL REFERENCES photographers(id),
    code text NOT NULL CHECK(code IN ('top-rated','punctual','loyal')),
    earned_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(photographer_id, code)
);
