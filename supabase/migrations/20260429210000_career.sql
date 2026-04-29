CREATE TABLE IF NOT EXISTS career (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  company     text NOT NULL,
  role        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date,
  description text,
  tags        text[] NOT NULL DEFAULT '{}',
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_slug_idx ON career(slug);

ALTER TABLE career ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_career" ON career FOR SELECT USING (published = true);
CREATE POLICY "service_write_career" ON career FOR ALL USING (true) WITH CHECK (true);
