-- Give reports a queryable evidence relation and an append-only status history.
-- The baseline reports.evidence_media_ids values are copied before the legacy column is removed.

CREATE TABLE report_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  media_id uuid NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, media_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM reports AS report
    CROSS JOIN LATERAL jsonb_array_elements_text(report.evidence_media_ids)
      WITH ORDINALITY AS evidence(media_id, ordinal)
    LEFT JOIN media ON media.id = evidence.media_id::uuid
    WHERE media.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate report evidence: one or more media records are missing';
  END IF;
END $$;

INSERT INTO report_evidences (report_id, media_id, sort_order, created_at, updated_at)
SELECT
  report.id,
  evidence.media_id::uuid,
  (evidence.ordinal - 1)::integer,
  report.created_at,
  report.updated_at
FROM reports AS report
CROSS JOIN LATERAL jsonb_array_elements_text(report.evidence_media_ids)
  WITH ORDINALITY AS evidence(media_id, ordinal)
ON CONFLICT (report_id, media_id) DO NOTHING;

CREATE INDEX report_evidences_report_order_idx
  ON report_evidences(report_id, sort_order, created_at, id);

CREATE TABLE report_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('created', 'status_changed', 'imported')),
  from_status text CHECK (from_status IN ('open', 'resolved', 'rejected', 'escalated')),
  to_status text NOT NULL CHECK (to_status IN ('open', 'resolved', 'rejected', 'escalated')),
  actor_user_id uuid REFERENCES users(id),
  actor_role text NOT NULL CHECK (actor_role IN ('user', 'admin', 'system')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((event_type = 'created' AND from_status IS NULL AND to_status = 'open')
      OR event_type <> 'created'),
  CHECK ((actor_role = 'system' AND actor_user_id IS NULL)
      OR (actor_role <> 'system' AND actor_user_id IS NOT NULL))
);

CREATE INDEX report_status_history_report_time_idx
  ON report_status_history(report_id, created_at, id);

-- Historical transitions cannot be reconstructed, so retain each existing report's last known state as an import snapshot.
INSERT INTO report_status_history (
  report_id,
  event_type,
  from_status,
  to_status,
  actor_user_id,
  actor_role,
  note,
  created_at,
  updated_at
)
SELECT
  report.id,
  'imported',
  NULL,
  report.status,
  COALESCE(report.resolved_by, report.user_id),
  CASE WHEN report.resolved_by IS NULL THEN 'user' ELSE 'admin' END,
  COALESCE(report.resolution, 'Imported current state; earlier status changes are unavailable.'),
  report.updated_at,
  report.updated_at
FROM reports AS report;

ALTER TABLE reports DROP COLUMN evidence_media_ids;

CREATE INDEX reports_status_created_idx
  ON reports(status, created_at DESC, id ASC);
CREATE INDEX reports_user_created_idx
  ON reports(user_id, created_at DESC, id ASC);
