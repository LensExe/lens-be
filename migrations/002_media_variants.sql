-- Adds generated image variants for thumbnail and preview URLs.
CREATE TABLE IF NOT EXISTS media_variants (
    id uuid PRIMARY KEY,
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    variant text NOT NULL CHECK(variant IN ('thumbnail','preview')),
    file_key text NOT NULL UNIQUE,
    file_size bigint NOT NULL CHECK(file_size > 0),
    content_type text NOT NULL,
    width integer,
    height integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(media_id, variant)
);
