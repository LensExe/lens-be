-- Store the application-level visibility of each media object.
ALTER TABLE media
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

ALTER TABLE media
  DROP CONSTRAINT IF EXISTS media_visibility_check;

ALTER TABLE media
  ADD CONSTRAINT media_visibility_check
  CHECK (visibility IN ('public', 'private'));
