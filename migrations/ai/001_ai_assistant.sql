CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_assistant_settings (
  photographer_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  tone_instructions text,
  min_similarity real NOT NULL DEFAULT 0.62
    CHECK (min_similarity >= 0 AND min_similarity <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  alternatives text[] NOT NULL DEFAULT '{}',
  embedding vector(1024),
  embedding_model text,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_knowledge_validity_check
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
  CONSTRAINT ai_knowledge_photographer_question_unique
    UNIQUE (photographer_id, question)
);

CREATE INDEX IF NOT EXISTS ai_knowledge_items_photographer_active_idx
  ON ai_knowledge_items (photographer_id, is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_reply_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  message_id text NOT NULL,
  channel_id text NOT NULL,
  photographer_id uuid NOT NULL,
  source_sender_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('answer', 'ask_clarification', 'handoff')),
  intent text NOT NULL,
  suggested_reply text,
  retrieval_similarity real,
  knowledge_item_ids uuid[] NOT NULL DEFAULT '{}',
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (
    status IN (
      'pending_review',
      'handoff',
      'generation_failed',
      'auto_sent',
      'skipped_online',
      'superseded'
    )
  ),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_reply_suggestions_photographer_status_created_idx
  ON ai_reply_suggestions (photographer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_reply_suggestions_message_idx
  ON ai_reply_suggestions (message_id);
