# INFRA — Database Migration & MCP Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all ELZ OS job-tracking data from `~/.elzos/elzos.db` (SQLite) into the WHATELZ Supabase project's `public` schema, merge ELZ OS docs into WHATELZ docs, and delete the now-redundant `/api/mcp/elzos` MCP route.

**Architecture:** Single `public` schema in Supabase holds everything — existing `docs_sections`/`docs_section_versions` plus 15 new job-tracking tables. A one-shot migration script reads SQLite, converts integer IDs to UUIDs, and inserts into Supabase. ELZ OS elzos schema is dropped after verification.

**Tech Stack:** Supabase CLI (migrations), better-sqlite3 (read SQLite), @supabase/supabase-js (write), tsx (run script), Next.js App Router (delete MCP route)

**Run order:** This plan MUST complete before APPLY, HUNT, or LISTEN plans begin.

---

## File Map

**Created:**
- `supabase/migrations/20260426000000_job_tracking_tables.sql` — DDL for all 15 new tables + indexes + RLS
- `scripts/migrate-sqlite-to-supabase.ts` — one-shot migration, reads SQLite, writes to Supabase public schema
- `scripts/merge-elzos-docs.ts` — reads elzos.docs_sections, patches/appends into public.docs_sections

**Deleted:**
- `app/api/mcp/elzos/` — entire directory (route + .well-known/* + oauth/*)
- `lib/elzos-docs.ts` — replaced by shared public schema

**Unmodified:** `lib/website-docs.ts`, `app/api/mcp/whatelz/` — already use public schema, no changes needed.

---

## Task 1: Create Supabase DDL migration

**Files:**
- Create: `supabase/migrations/20260426000000_job_tracking_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260426000000_job_tracking_tables.sql
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
  ('Interview invites',        'subject', '(interview|schedule|call|meet)',                                          'notify'),
  ('Rejections',               'subject', '(unfortunately|regret|not moving forward|other candidates)',              'link_to_application'),
  ('Application confirmations','subject', '(application received|thank you for applying|successfully submitted)',    'link_to_application'),
  ('Recruiter outreach',       'subject', '(opportunity|position|role|hiring|recruit)',                              'flag')
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
  ('version',                  '1.0.0'),
  ('autonomy_level',           'supervised'),
  ('job_agent_schedule',       '02:00'),
  ('email_poll_interval_sec',  '1800'),
  ('default_location_filter',  'Singapore'),
  ('include_remote',           'true')
ON CONFLICT (key) DO NOTHING;

-- RLS: enable on all new tables, service role bypasses via RLS policies
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
```

- [ ] **Step 2: Apply migration**

```bash
cd /Users/whatelz/Documents/GitHub/whatelz
npx supabase db push
```

Expected: `Applied 1 migration. Done.`

- [ ] **Step 3: Verify tables exist**

```bash
npx supabase db execute --sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | grep -E "companies|job_listings|applications|resumes|user_profile"
```

Expected: all 5 table names appear in output.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260426000000_job_tracking_tables.sql
git commit -m "feat(infra): add job-tracking tables to public schema"
```

---

## Task 2: Write SQLite → Supabase migration script

**Files:**
- Create: `scripts/migrate-sqlite-to-supabase.ts`

- [ ] **Step 1: Install dependencies if missing**

```bash
cd /Users/whatelz/Documents/GitHub/whatelz
npm list better-sqlite3 || npm install better-sqlite3 @types/better-sqlite3 --save-dev
```

- [ ] **Step 2: Write the migration script**

```typescript
// scripts/migrate-sqlite-to-supabase.ts
// One-shot migration: reads ~/.elzos/elzos.db, writes to Supabase public schema.
// Safe to re-run: uses ON CONFLICT DO NOTHING for all inserts.

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';

const SQLITE_PATH = join(homedir(), '.elzos', 'elzos.db');
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ID maps: old integer → new UUID
const jobSourceMap = new Map<number, string>();
const companyMap   = new Map<number, string>();
const resumeMap    = new Map<number, string>();
const accountMap   = new Map<number, string>();
const listingMap   = new Map<number, string>();
const appMap       = new Map<number, string>();

function toTs(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBool(v: number | null): boolean {
  return v === 1;
}

async function insert(table: string, rows: object[]): Promise<void> {
  if (rows.length === 0) return;
  // Batch in chunks of 500 to stay within Supabase request limits
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

async function migrateJobSources(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM job_sources').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    jobSourceMap.set(r.id, id);
    return {
      id, name: r.name, base_url: r.base_url,
      auth_type: r.auth_type, is_enabled: toBool(r.is_enabled),
      config: r.config ? JSON.parse(r.config) : null,
      created_at: toTs(r.created_at),
    };
  });
  await insert('job_sources', mapped);
}

async function migrateCompanies(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM companies').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    companyMap.set(r.id, id);
    return {
      id, name: r.name, industry: r.industry, website: r.website,
      careers_url: r.careers_url, ats_type: r.ats_type, ats_slug: r.ats_slug,
      priority: r.priority, status: r.status, source: 'derived',
      last_checked_at: toTs(r.last_checked_at),
      last_fetch_count: r.last_fetch_count ?? 0, notes: r.notes,
      created_at: toTs(r.created_at), updated_at: toTs(r.updated_at),
    };
  });
  await insert('companies', mapped);
}

async function migrateResumes(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM resumes').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    resumeMap.set(r.id, id);
    return {
      id, label: r.label, raw_text: r.raw_text,
      structured: r.structured ? JSON.parse(r.structured) : {},
      file_path: r.file_path, is_active: toBool(r.is_active),
      created_at: toTs(r.created_at), updated_at: toTs(r.updated_at),
    };
  });
  await insert('resumes', mapped);
}

async function migrateEmailAccounts(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM email_accounts').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    accountMap.set(r.id, id);
    return {
      id, label: r.label, email: r.email,
      imap_host: r.imap_host, imap_port: r.imap_port,
      smtp_host: r.smtp_host, smtp_port: r.smtp_port,
      auth_type: r.auth_type,
      credentials: r.credentials ? JSON.parse(r.credentials) : null,
      is_active: toBool(r.is_active), last_sync_at: toTs(r.last_sync_at),
      created_at: toTs(r.created_at),
    };
  });
  await insert('email_accounts', mapped);
}

async function migrateJobListings(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM job_listings').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    listingMap.set(r.id, id);
    return {
      id,
      source_id:       r.source_id  ? jobSourceMap.get(r.source_id)  ?? null : null,
      company_id:      r.company_id ? companyMap.get(r.company_id)   ?? null : null,
      external_id: r.external_id, external_url: r.external_url,
      company: r.company, role: r.role, location: r.location,
      remote_type: r.remote_type,
      salary_min: r.salary_min, salary_max: r.salary_max,
      salary_currency: r.salary_currency ?? 'SGD',
      description: r.description,
      requirements: r.requirements ? JSON.parse(r.requirements) : null,
      posted_at: toTs(r.posted_at), discovered_at: toTs(r.discovered_at),
      match_score: r.match_score,
      score_breakdown: r.score_breakdown ? JSON.parse(r.score_breakdown) : null,
      score_reasoning: r.score_reasoning,
      status: r.status ?? 'new', source: 'derived', user_notes: r.user_notes,
    };
  });
  await insert('job_listings', mapped);
}

async function migrateApplications(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM applications').all();
  const mapped = rows.map(r => {
    const id = randomUUID();
    appMap.set(r.id, id);
    return {
      id,
      listing_id: r.listing_id ? listingMap.get(r.listing_id) ?? null : null,
      resume_id:  r.resume_id  ? resumeMap.get(r.resume_id)   ?? null : null,
      cover_letter: r.cover_letter,
      resume_bullets:  r.resume_bullets  ? JSON.parse(r.resume_bullets)  : null,
      custom_answers:  r.custom_answers  ? JSON.parse(r.custom_answers)  : null,
      status: r.status ?? 'draft', applied_at: toTs(r.applied_at),
      applied_via: r.applied_via, response_status: r.response_status,
      last_response_at: toTs(r.last_response_at),
      follow_up_at: toTs(r.follow_up_at), follow_up_count: r.follow_up_count ?? 0,
      created_at: toTs(r.created_at), updated_at: toTs(r.updated_at),
    };
  });
  await insert('applications', mapped);
}

async function migrateApplicationEvents(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM application_events').all();
  const mapped = rows.map(r => ({
    id: randomUUID(),
    application_id: appMap.get(r.application_id) ?? null,
    event_type: r.event_type, old_value: r.old_value, new_value: r.new_value,
    details: r.details ? JSON.parse(r.details) : null,
    source: r.source ?? 'system', created_at: toTs(r.created_at),
  })).filter(r => r.application_id !== null);
  await insert('application_events', mapped);
}

async function migrateEmails(): Promise<void> {
  const rows: any[] = sqlite.prepare('SELECT * FROM emails').all();
  const mapped = rows.map(r => ({
    id: randomUUID(),
    account_id:     r.account_id     ? accountMap.get(r.account_id)   ?? null : null,
    application_id: r.application_id ? appMap.get(r.application_id)   ?? null : null,
    message_id: r.message_id, thread_id: r.thread_id,
    in_reply_to: r.in_reply_to, from_address: r.from_address,
    to_address: r.to_address, subject: r.subject,
    body_text: r.body_text, body_html: r.body_html,
    direction: r.direction, is_read: toBool(r.is_read), is_flagged: toBool(r.is_flagged),
    received_at: toTs(r.received_at), created_at: toTs(r.created_at),
  }));
  await insert('emails', mapped);
}

async function migrateSimple(): Promise<void> {
  // Tables with no FK dependencies — insert directly with new UUIDs

  const userProfile: any[] = sqlite.prepare('SELECT * FROM user_profile').all();
  await insert('user_profile', userProfile.map(r => ({
    id: randomUUID(), category: r.category, key: r.key, value: r.value,
    source: r.source ?? 'manual', confidence: r.confidence ?? 1.0,
    sort_order: r.sort_order ?? 0, updated_at: toTs(r.updated_at),
  })));

  const briefings: any[] = sqlite.prepare('SELECT * FROM briefings').all();
  await insert('briefings', briefings.map(r => ({
    id: randomUUID(), date: r.date, content: r.content, summary: r.summary,
    items: r.items ? JSON.parse(r.items) : [],
    created_at: toTs(r.created_at),
  })));

  const agentRuns: any[] = sqlite.prepare('SELECT * FROM agent_runs').all();
  await insert('agent_runs', agentRuns.map(r => ({
    id: randomUUID(), agent: r.agent, status: r.status,
    started_at: toTs(r.started_at), finished_at: toTs(r.finished_at),
    result: r.result ? JSON.parse(r.result) : null, error: r.error,
    items_found: r.items_found ?? 0, items_acted: r.items_acted ?? 0,
  })));

  const notifications: any[] = sqlite.prepare('SELECT * FROM notifications').all();
  await insert('notifications', notifications.map(r => ({
    id: randomUUID(), module: r.module, title: r.title, body: r.body,
    priority: r.priority ?? 'normal', is_read: toBool(r.is_read),
    action_type: r.action_type, action_id: null, // integer → uuid not mappable
    created_at: toTs(r.created_at),
  })));

  const writingSamples: any[] = sqlite.prepare('SELECT * FROM writing_samples').all();
  await insert('writing_samples', writingSamples.map(r => ({
    id: randomUUID(), category: r.category, content: r.content,
    was_edited: toBool(r.was_edited), original: r.original,
    created_at: toTs(r.created_at),
  })));
}

async function main(): Promise<void> {
  console.log('Starting SQLite → Supabase migration...\n');
  console.log('Phase 1: tables with no FK dependencies');
  await migrateJobSources();
  await migrateCompanies();
  await migrateResumes();
  await migrateEmailAccounts();
  await migrateSimple();

  console.log('\nPhase 2: tables with FK dependencies');
  await migrateJobListings();
  await migrateApplications();
  await migrateApplicationEvents();
  await migrateEmails();

  console.log('\n✅ Migration complete.');
  sqlite.close();
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Add script to package.json**

Open `package.json`. Find the `"scripts"` block. Add:
```json
"migrate:sqlite": "SUPABASE_URL=$SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY tsx scripts/migrate-sqlite-to-supabase.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-sqlite-to-supabase.ts package.json
git commit -m "feat(infra): SQLite → Supabase migration script"
```

---

## Task 3: Run migration and verify

**Files:** none (data operation only)

- [ ] **Step 1: Confirm env vars are loaded**

```bash
grep -E "SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" .env.local
```

Expected: both vars present and non-empty.

- [ ] **Step 2: Run migration**

```bash
npm run migrate:sqlite
```

Expected output:
```
Phase 1: tables with no FK dependencies
  ✓ job_sources: N rows
  ✓ companies: 68 rows
  ✓ resumes: 1 rows
  ✓ email_accounts: 1 rows
  ✓ user_profile: 73 rows
  ...
Phase 2: tables with FK dependencies
  ✓ job_listings: 2421 rows
  ✓ applications: 7 rows
  ✓ application_events: 7 rows
  ✓ emails: 352 rows

✅ Migration complete.
```

- [ ] **Step 3: Verify counts in Supabase**

```bash
npx supabase db execute --sql "
  SELECT 'companies'    , COUNT(*) FROM companies     UNION ALL
  SELECT 'job_listings' , COUNT(*) FROM job_listings  UNION ALL
  SELECT 'applications' , COUNT(*) FROM applications  UNION ALL
  SELECT 'emails'       , COUNT(*) FROM emails         UNION ALL
  SELECT 'user_profile' , COUNT(*) FROM user_profile;
"
```

Expected: companies=68, job_listings=2421, applications=7, emails=352, user_profile=73.

---

## Task 4: Merge ELZ OS docs into WHATELZ docs

**Files:**
- Create: `scripts/merge-elzos-docs.ts`

- [ ] **Step 1: Write merge script**

```typescript
// scripts/merge-elzos-docs.ts
// Reads elzos.docs_sections, appends new content into public.docs_sections.
// Run ONCE after migration. Idempotent: skips headings that already exist.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Read all current sections from elzos schema
async function readElzosDoc(slug: string): Promise<Array<{ heading: string; content: string; position: number }>> {
  const { data, error } = await supabase
    .schema('elzos' as any)
    .from('docs_sections')
    .select('heading, content, position')
    .eq('doc_slug', slug)
    .eq('is_current', true)
    .order('position');
  if (error) { console.warn(`  ⚠ elzos ${slug}: ${error.message}`); return []; }
  return data ?? [];
}

// Get current max position in public doc
async function maxPosition(slug: string): Promise<number> {
  const { data } = await supabase
    .from('docs_sections')
    .select('position')
    .eq('doc_slug', slug)
    .eq('is_current', true)
    .order('position', { ascending: false })
    .limit(1);
  return data?.[0]?.position ?? -1;
}

// Check if heading already exists
async function headingExists(slug: string, heading: string): Promise<boolean> {
  const { count } = await supabase
    .from('docs_sections')
    .select('id', { count: 'exact', head: true })
    .eq('doc_slug', slug)
    .eq('heading', heading)
    .eq('is_current', true);
  return (count ?? 0) > 0;
}

async function appendSection(slug: string, heading: string, content: string): Promise<void> {
  const exists = await headingExists(slug, heading);
  if (exists) { console.log(`    skip (exists): ${heading}`); return; }
  const pos = await maxPosition(slug) + 1;
  const { error } = await supabase.from('docs_sections').insert({
    doc_slug: slug, heading, content, position: pos, version: 1, is_current: true,
  });
  if (error) throw new Error(`append ${slug}/${heading}: ${error.message}`);
  console.log(`    ✓ appended: ${heading}`);
}

async function main(): Promise<void> {
  console.log('Merging ELZ OS docs into WHATELZ public docs...\n');

  // METHODOLOGY + USERMANUAL → new sections in INSTRUCTIONS
  console.log('INSTRUCTIONS: absorbing METHODOLOGY and USERMANUAL');
  const methodology = await readElzosDoc('METHODOLOGY');
  for (const s of methodology) {
    await appendSection('INSTRUCTIONS', `[ELZ OS] ${s.heading}`, s.content);
  }
  const usermanual = await readElzosDoc('USERMANUAL');
  for (const s of usermanual) {
    await appendSection('INSTRUCTIONS', `[Admin] ${s.heading}`, s.content);
  }

  // CONTEXT: add ELZ OS context sections not already in WHATELZ CONTEXT
  console.log('\nCONTEXT: merging ELZ OS context');
  const elzosContext = await readElzosDoc('CONTEXT');
  for (const s of elzosContext) {
    await appendSection('CONTEXT', `[Profile] ${s.heading}`, s.content);
  }

  // BUILD: add ELZ OS BUILD backlog as HUNT module ideas
  console.log('\nBUILD: importing ELZ OS housekeeping as HUNT sprints');
  const elzosBuild = await readElzosDoc('BUILD');
  const backlog = elzosBuild.find(s => s.heading === 'Backlog');
  if (backlog) {
    await appendSection('BUILD', 'HUNT Module — ELZ OS Backlog (imported)', backlog.content);
  }

  // IDEAS: add ELZ OS backlog deferred items
  console.log('\nIDEAS: importing deferred ELZ OS features');
  if (backlog) {
    await appendSection('IDEAS', 'ELZ OS deferred features (health, social, network, voice, mobile)', backlog.content);
  }

  console.log('\n✅ Doc merge complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add script to package.json**

In `package.json` scripts, add:
```json
"merge:elzos-docs": "SUPABASE_URL=$SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY tsx scripts/merge-elzos-docs.ts"
```

- [ ] **Step 3: Run merge**

```bash
npm run merge:elzos-docs
```

Expected: sections appended to INSTRUCTIONS, CONTEXT, BUILD, IDEAS with no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/merge-elzos-docs.ts package.json
git commit -m "feat(infra): ELZ OS doc merge script"
```

---

## Task 5: Delete /api/mcp/elzos and lib/elzos-docs.ts

**Files:**
- Delete: `app/api/mcp/elzos/` (entire directory tree)
- Delete: `lib/elzos-docs.ts`

- [ ] **Step 1: Remove the elzos MCP directory**

```bash
rm -rf app/api/mcp/elzos
```

- [ ] **Step 2: Remove the elzos docs library**

```bash
rm lib/elzos-docs.ts
```

- [ ] **Step 3: Remove elzos seed script references**

```bash
grep -r "elzos" scripts/ --include="*.ts" -l
```

Remove or archive any scripts that reference elzos-specific paths (e.g. `scripts/seed-elzos-from-export.ts`, `scripts/elzos-export-local.ts`). These are no longer needed — data is now in Supabase.

```bash
rm -f scripts/seed-elzos-from-export.ts scripts/elzos-export-local.ts
```

- [ ] **Step 4: Verify no dangling imports**

```bash
grep -r "elzos-docs\|api/mcp/elzos\|ELZOS_MCP_TOKEN" --include="*.ts" --include="*.tsx" . | grep -v "node_modules\|\.next"
```

Expected: no output. If any references found, remove them.

- [ ] **Step 5: Verify build is green**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(infra): delete /api/mcp/elzos and lib/elzos-docs — consolidated into public schema"
```

---

## Task 6: Drop elzos schema from Supabase

**Files:**
- Create: `supabase/migrations/20260426000001_drop_elzos_schema.sql`

- [ ] **Step 1: Write the drop migration**

```sql
-- supabase/migrations/20260426000001_drop_elzos_schema.sql
-- Drop the elzos schema after verifying all data is in public schema.
-- All docs content was merged in Task 4. All job data was migrated in Task 3.
DROP SCHEMA IF EXISTS elzos CASCADE;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: `Applied 1 migration. Done.`

- [ ] **Step 3: Verify**

```bash
npx supabase db execute --sql "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'elzos';"
```

Expected: 0 rows returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260426000001_drop_elzos_schema.sql
git commit -m "feat(infra): drop elzos schema — fully consolidated into public"
```

---

**INFRA plan complete. All downstream plans (APPLY, HUNT, LISTEN) can now begin.**
