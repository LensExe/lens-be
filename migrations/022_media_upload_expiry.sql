-- Give pending upload reservations a deadline so abandoned presigned URLs
-- do not hold storage quota indefinitely.
ALTER TABLE media
  ADD COLUMN upload_expires_at timestamptz;

UPDATE media
SET upload_expires_at = created_at + interval '24 hours'
WHERE status = 'pending';

CREATE INDEX media_pending_upload_expiry_idx
  ON media(upload_expires_at, id)
  WHERE status = 'pending' AND upload_expires_at IS NOT NULL;
