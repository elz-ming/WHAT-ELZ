# WHATELZ × ELZ OS Merge — Design Spec
**Date:** 2026-04-26  
**Status:** Approved for implementation planning

---

## Mission

One project. One philosophy: **help Edmund get a job.**

The public site displays Edmund's best self. The admin hunts, applies, and listens for opportunities. Same goal, four modules, one repo, one database.

---

## Four Modules

| Module | What it does | Primary surface |
|--------|-------------|-----------------|
| **PRESENCE** | Public portfolio — display Edmund's best self. Portfolio, blog, services, AI chat widget. | `whatelz.ai` (public) |
| **HUNT** | Find opportunities — company watchlist, job discovery via ATS APIs, AI scoring. | `/admin/hunt` |
| **APPLY** | Mass send — AI resume builder, cover letter drafting, review queue, ATS submission. | `/admin/apply` |
| **LISTEN** | Catch responses — Gmail integration, domain-to-company matching, status updates, follow-up scheduling. | `/admin/listen` |

---

## Architecture

```
3 repos · 3 Vercel projects · 3 Supabase projects

whatelz repo (this one)
├── Public site    /           PRESENCE module
└── Admin site     /admin      HUNT · APPLY · LISTEN modules (Clerk-gated)

Vercel: whatelz project (prj_V0Cp30OfnpqktAWD2GyqalTgPP0b)
  └── uat branch → whatelz-uat.vercel.app
  └── main branch → whatelz.vercel.app (production)

Supabase: tnjujbkpepchhgyqwmtb
  └── public schema — everything. Docs + job tracking. One schema.

Inngest: cloud cron agents (replaces Mac daemon)
  ├── job-discovery     scrape ATS boards, score listings
  ├── email-sync        Gmail API → match domains → update statuses
  ├── follow-up-check   flag overdue applications
  └── morning-briefing  daily digest

ELZ OS (ELZ-OS repo)
  └── local Electron client — db.ts swapped from SQLite → Supabase
      all agent logic, scrapers, GUI unchanged
      archived once Inngest agents cover the full daemon scope

ADMIN_WHATELZ MCP (/api/mcp/whatelz)
  └── reads/writes public schema — docs + job tables via future tool additions
  └── /api/mcp/elzos — deleted after migration
```

---

## Database — public schema

### Existing (untouched)
```sql
docs_sections           -- MCP docs, all slugs
docs_section_versions   -- version history
```

### Migrated from ELZ OS SQLite (~/.elzos/elzos.db)

Live data at migration time: 68 companies · 2,421 job listings · 7 applications · 352 emails · 1 resume · 73 user_profile entries.

```sql
-- Identity / profile
user_profile            -- structured facts about Edmund (category, key, value, source)
resumes                 -- resume variants (label, raw_text, structured JSON, is_active)
writing_samples         -- approved drafts for voice learning

-- Job search
job_sources             -- linkedin | jobstreet | greenhouse | lever | ashby | workable
search_criteria         -- saved search profiles (filters JSON)
companies               -- 68 target companies (name, industry, ats_type, ats_slug, priority, status)
job_listings            -- 2,421 discovered listings (company, role, score, status)

-- Applications
applications            -- 7 active (draft → ready → submitted → interviewing → offered)
application_events      -- full timeline per application
interview_prep          -- LLM-generated prep per application

-- Email
email_accounts          -- 1 account: elz.work22@gmail.com
emails                  -- 352 job-related threads
email_listeners         -- 4 matching rules (interview invites, rejections, confirmations, outreach)

-- Ops
agent_runs              -- history of all automated job runs
notifications           -- pending action items
briefings               -- morning briefing archive
preferences             -- learned preferences
interactions            -- decision log for pattern learning
system_config           -- key/value settings
```

### Schema changes from SQLite → Supabase
- `id` columns: `INTEGER AUTOINCREMENT` → `uuid DEFAULT gen_random_uuid()`
- All timestamps: SQLite `TEXT` (ISO strings) → Postgres `timestamptz`
- Foreign keys: same structure, Postgres-native
- RLS: enabled on all tables; service role bypasses (same pattern as existing docs tables)
- `source` discriminator column on `companies`, `job_listings`, `resumes`: `derived | manual` — ELZ OS writes `derived`; Edmund writes `manual`; ELZ OS skips `manual` rows on sync

---

## Application Flow — "B path" (draft → approve → auto-submit)

```
1. Inngest job-discovery
   └── scrapes Greenhouse/Lever/Ashby APIs (public, no auth required)
   └── LinkedIn via Playwright (existing ELZ OS code, ported)
   └── inserts into job_listings, scores via AI

2. Admin /hunt
   └── Edmund sees scored listings, shortlists or dismisses

3. Admin /apply
   └── Edmund selects shortlisted listings
   └── AI drafts: cover letter + customised resume bullets per role
   └── Drafts land in review queue (status = 'ready')

4. Review queue
   └── Edmund reviews each draft (target: 2 min/application)
   └── Edits inline if needed
   └── Clicks "Approve" or "Approve All"

5. Inngest apply-batch
   └── Picks up approved applications
   └── Submits via ATS channel:
       - LinkedIn Easy Apply → Playwright (existing linkedin-apply.ts, ported)
       - Greenhouse / Lever / Ashby → fetch-based API (existing ats/ modules, ported)
       - Workday → Playwright (existing workday/ module, ported — lowest priority, most fragile)
       - Email / manual → generates mailto draft, Edmund sends
   └── Updates application status to 'submitted'
   └── Creates notification

6. LISTEN module (continuous, Inngest email-sync)
   └── Gmail API polls for new emails
   └── Domain matching: @coinbase.com → Coinbase → links to application
   └── Classifies: interview invite | rejection | confirmation | outreach | ghosted
   └── Updates application_events + application status
   └── Creates notification for Edmund
```

---

## Resume Builder — APPLY module, first sprint

AI-assisted, MYSTORY + user_profile as source of truth. No generic templates.

**Flow:**
1. Edmund opens `/admin/apply/resume`
2. Selects target role type (AI Engineer / Full-stack / General)
3. AI reads MYSTORY doc + user_profile table → drafts structured resume
4. Edmund edits inline (rich text, bullet by bullet)
5. Export: PDF via browser print, Markdown for further editing
6. Saved as new resume variant in `resumes` table

**Positioning problem (the "too many things" issue):**  
The AI leads with one narrative thread — not a list of everything Edmund has done. Default thread: *AI Engineer with production systems experience and business fluency.* Edmund can prompt a different angle (co-founder, data scientist, PM). The AI picks the top 3–4 experiences and 5–6 skills that support the chosen narrative, and deprioritises the rest.

**Critical constraint:** No hallucination. Every bullet must be grounded in MYSTORY or user_profile. The AI improves phrasing, not facts.

---

## Doc Consolidation

Unified to **6 slugs** in `public.docs_sections`. ELZ OS had 6 docs; WHATELZ had 6 docs. They collapse to the same 6 by merging overlapping content.

| Slug | What survives | Source |
|------|--------------|--------|
| `CONTEXT` | Full Edmund profile: Vision, Audiences, Positioning, Projects, Channels, Voice, Brand Identity, Site Identity. **Add:** ELZ OS user profile facts as a new "Profile Facts" section (the 73 `user_profile` rows in structured form). | WHATELZ CONTEXT (keep) + ELZ OS user_profile data (add) |
| `MYSTORY` | Edmund's narrative arc. Stays as-is. | WHATELZ only |
| `BUILD` | Unified sprint tracker. Sprints tagged by module (PRESENCE / HUNT / APPLY / LISTEN). **Add:** ELZ OS BUILD housekeeping items as HUNT module sprints. | WHATELZ BUILD (expand) |
| `INSTRUCTIONS` | One set of Claude operating rules. **Add:** ELZ OS METHODOLOGY content (how the system works) + ELZ OS USERMANUAL content (how to use the admin) as new sections. | WHATELZ INSTRUCTIONS (expand) |
| `IDEAS` | Backlog. Stays as-is. ELZ OS BUILD backlog items (health tracking, social, network, voice, mobile) added as deferred IDEAS. | WHATELZ IDEAS (expand) |
| `INBOX` | External agent proposals. Stays as-is. ELZ OS INBOX content merged in (no active proposals to carry over). | WHATELZ INBOX (keep) |

ELZ OS slugs `USERMANUAL` and `METHODOLOGY` are dissolved — content absorbed into `INSTRUCTIONS`.

---

## ELZ OS Client Changes

**One change only:** `src/core/db.ts`

Replace `better-sqlite3` with `@supabase/supabase-js` pointing at the WHATELZ Supabase project. All queries rewritten from SQLite sync API to Supabase async. All agent logic, scrapers, Electron GUI, CLI, MCP server — unchanged.

**Env vars to add to ELZ OS `.env`:**
```
SUPABASE_URL=https://tnjujbkpepchhgyqwmtb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
```

**Migration is complete when:** ELZ OS reads/writes Supabase and the local `~/.elzos/elzos.db` file is no longer needed.

---

## MCP Changes

| Route | Fate |
|-------|------|
| `/api/mcp/whatelz` | Stays. Renamed schema ref from `public` (no change needed — already default). Future: add job-tracking tools. |
| `/api/mcp/elzos` | Deleted. `lib/elzos-docs.ts` deleted. Connector `ADMIN_ELZOS` removed from Claude Code. |
| `ADMIN_WHATELZ` connector | Stays. Single connector for all doc + future job-tracking MCP tools. |

---

## Inngest Agents (replacing Mac daemon)

| Agent | Schedule | What it does |
|-------|----------|-------------|
| `job-discovery` | 3× daily (6AM, 12PM, 6PM SGT) | Greenhouse/Lever/Ashby API scrape for watchlist companies. LinkedIn scrape where ATS unknown. Scores new listings via AI. |
| `email-sync` | Every 30 min | Gmail API poll. Domain → company match. Classify and update application status. |
| `follow-up-check` | Daily 9AM SGT | Flag applications overdue for follow-up (14+ days, no response). Create notifications. |
| `morning-briefing` | Daily 8AM SGT | Aggregate overnight activity → daily digest → save to `briefings` table. |
| `apply-batch` | On-demand (triggered by approval) | Submit approved applications via ATS channel. |

ATS priority order: LinkedIn Easy Apply → Greenhouse/Lever/Ashby fetch → Workday Playwright → email draft.

---

## Admin UI Structure

```
/admin
├── Dashboard        Overview: pipeline counts, unread notifications, morning briefing
├── Resume           AI-assisted builder (APPLY module, sprint 1)
├── Companies        Watchlist: add/edit/prioritise target companies (HUNT)
├── Jobs             Discovery feed: scored listings, shortlist/dismiss (HUNT)
├── Applications     Pipeline view: draft → submitted → tracking (APPLY + LISTEN)
├── Email            Thread viewer: matched emails per application (LISTEN)
└── Settings         Inngest agent schedules, search criteria, system config
```

---

## Migration Sequence

1. **Create Supabase tables** — DDL for all 15 job tracking tables in `public` schema. Supabase migration files.
2. **Write migration script** — reads `~/.elzos/elzos.db`, transforms types (INTEGER ids → UUIDs, TEXT timestamps → timestamptz), inserts into Supabase. One-shot, idempotent.
3. **Run migration** — verify row counts match SQLite source.
4. **Merge ELZ OS docs** — read `elzos.docs_sections`, patch/append content into corresponding `public.docs_sections` slugs per the consolidation table above.
5. **Delete `/api/mcp/elzos`** — route, lib file, OAuth routes.
6. **Update ELZ OS db.ts** — swap SQLite → Supabase.
7. **Update `elzos` schema** — drop (after confirming all data is in `public`).
8. **Wire Inngest agents** — port daemon tasks from ELZ OS to Inngest functions.
9. **Build admin UI** — Resume first, then Companies, Jobs, Applications, Email.
10. **Archive ELZ OS repo** — when Inngest covers daemon scope and ELZ OS is purely a thin Supabase client.

---

## Out of Scope (v1)

- Workday automation (highest-maintenance ATS — add after LinkedIn + Greenhouse/Lever are validated)
- Session memory for the chat widget
- Rate-limit upgrade for chat (in-memory is fine until real traffic)
- Health tracking, social media management, network tracking modules (ELZ OS backlog — post-job-search)
- Custom `whatelz.ai` domain (Edmund's call, deferred from sprint 003)
- OG image (chore, not blocking)
- Mobile companion app
