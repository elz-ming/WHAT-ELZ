-- Job tracking tables for WHATELZ public schema.
-- docs_sections and docs_section_versions already exist — do NOT touch them.

CREATE TABLE IF NOT EXISTS user_profile (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category    text NOT NULL DEFAULT 'basics',
  key         text NOT NULL,
  value       text NOT NULL,
  source      text DEFAULT 'manual',
  confidence  real DEFAULT 1.0,
  sort_order  integer DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS resumes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text NOT NULL DEFAULT 'primary',
  raw_text    text NOT NULL,
  structured  jsonb NOT NULL DEFAULT '{}',
  file_path   text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_sources (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  base_url    text,
  auth_type   text DEFAULT 'none',
  is_enabled  boolean DEFAULT true,
  config      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO job_sources (name, base_url, auth_type) VALUES
  ('linkedin',   'https://www.linkedin.com/login', 'cookie'),
  ('jobstreet',  'https://www.jobstreet.com.sg',   'cookie'),
  ('greenhouse', NULL, 'none'),
  ('lever',      NULL, 'none'),
  ('ashby',      NULL, 'none'),
  ('workable',   NULL, 'none')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS companies (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL UNIQUE,
  industry         text,
  website          text,
  careers_url      text,
  ats_type         text,
  ats_slug         text,
  priority         integer DEFAULT 3,
  status           text DEFAULT 'active',
  source           text DEFAULT 'manual',
  last_checked_at  timestamptz,
  last_fetch_count integer DEFAULT 0,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_status   ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_priority ON companies(priority);

CREATE TABLE IF NOT EXISTS search_criteria (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text NOT NULL,
  filters     jsonb NOT NULL DEFAULT '{}',
  is_active   boolean DEFAULT true,
  last_run_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_listings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id       uuid REFERENCES job_sources(id),
  external_id     text,
  external_url    text,
  company         text NOT NULL,
  role            text NOT NULL,
  location        text,
  remote_type     text,
  salary_min      integer,
  salary_max      integer,
  salary_currency text DEFAULT 'SGD',
  description     text,
  requirements    jsonb,
  posted_at       timestamptz,
  discovered_at   timestamptz NOT NULL DEFAULT now(),
  company_id      uuid REFERENCES companies(id),
  match_score     real,
  score_breakdown jsonb,
  score_reasoning text,
  status          text DEFAULT 'new',
  source          text DEFAULT 'derived',
  user_notes      text,
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_status  ON job_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_score   ON job_listings(match_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_listings_company ON job_listings(company);

CREATE TABLE IF NOT EXISTS applications (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id       uuid REFERENCES job_listings(id),
  resume_id        uuid REFERENCES resumes(id),
  cover_letter     text,
  resume_bullets   jsonb,
  custom_answers   jsonb,
  status           text DEFAULT 'draft',
  applied_at       timestamptz,
  applied_via      text,
  response_status  text,
  last_response_at timestamptz,
  follow_up_at     timestamptz,
  follow_up_count  integer DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_status   ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_followup ON applications(follow_up_at NULLS LAST);

CREATE TABLE IF NOT EXISTS application_events (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  old_value      text,
  new_value      text,
  details        jsonb,
  source         text DEFAULT 'system',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_app  ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON application_events(event_type);

CREATE TABLE IF NOT EXISTS interview_prep (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  content        text NOT NULL,
  stage          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label        text NOT NULL,
  email        text NOT NULL UNIQUE,
  imap_host    text NOT NULL,
  imap_port    integer DEFAULT 993,
  smtp_host    text NOT NULL,
  smtp_port    integer DEFAULT 587,
  auth_type    text DEFAULT 'oauth2',
  credentials  jsonb,
  is_active    boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emails (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id     uuid REFERENCES email_accounts(id),
  message_id     text UNIQUE,
  thread_id      text,
  in_reply_to    text,
  from_address   text NOT NULL,
  to_address     text,
  subject        text,
  body_text      text,
  body_html      text,
  direction      text NOT NULL,
  is_read        boolean DEFAULT false,
  is_flagged     boolean DEFAULT false,
  application_id uuid REFERENCES applications(id),
  received_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_app    ON emails(application_id);
CREATE INDEX IF NOT EXISTS idx_emails_from   ON emails(from_address);

CREATE TABLE IF NOT EXISTS email_listeners (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text NOT NULL,
  match_type  text NOT NULL,
  match_value text NOT NULL,
  action      text NOT NULL,
  config      jsonb,
  is_active   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO email_listeners (label, match_type, match_value, action) VALUES
  ('Interview invites',         'subject', '(interview|schedule|call|meet)',                                        'notify'),
  ('Rejections',                'subject', '(unfortunately|regret|not moving forward|other candidates)',            'link_to_application'),
  ('Application confirmations', 'subject', '(application received|thank you for applying|successfully submitted)', 'link_to_application'),
  ('Recruiter outreach',        'subject', '(opportunity|position|role|hiring|recruit)',                           'flag')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS briefings (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date NOT NULL UNIQUE,
  content    text NOT NULL,
  summary    text,
  items      jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent        text NOT NULL,
  status       text DEFAULT 'running',
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  result       jsonb,
  error        text,
  items_found  integer DEFAULT 0,
  items_acted  integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module      text NOT NULL,
  title       text NOT NULL,
  body        text,
  priority    text DEFAULT 'normal',
  is_read     boolean DEFAULT false,
  action_type text,
  action_id   uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE NOT is_read;

CREATE TABLE IF NOT EXISTS preferences (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  domain       text NOT NULL,
  key          text NOT NULL,
  value        text NOT NULL,
  learned_from text,
  strength     real DEFAULT 0.5,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain, key)
);

CREATE TABLE IF NOT EXISTS writing_samples (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category   text NOT NULL,
  content    text NOT NULL,
  was_edited boolean DEFAULT false,
  original   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module      text NOT NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_config (key, value) VALUES
  ('version',                 '1.0.0'),
  ('autonomy_level',          'supervised'),
  ('job_agent_schedule',      '02:00'),
  ('email_poll_interval_sec', '1800'),
  ('default_location_filter', 'Singapore'),
  ('include_remote',          'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE user_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_criteria    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prep     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails             ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_listeners    ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_samples    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config      ENABLE ROW LEVEL SECURITY;
