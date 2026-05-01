CREATE TABLE IF NOT EXISTS chat_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        text,
  question         text        NOT NULL,
  response_summary text,
  page_url         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs (created_at DESC);
