# HUNT Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the HUNT module — public ATS job board scrapers (Greenhouse, Lever, Ashby) wired to Inngest cloud cron, plus the `/admin/hunt` UI for managing the company watchlist and browsing scored job listings.

**Architecture:** Greenhouse, Lever, and Ashby all expose public JSON job board APIs — no auth, no Playwright needed. Inngest functions run on a schedule, fetch listings for each active company, score them with Claude, and upsert into `public.job_listings`. The admin UI is server-rendered with client-side shortlisting actions.

**Tech Stack:** Next.js 16 App Router, Inngest, Supabase (public schema), Anthropic SDK (scoring), Tailwind CSS v4

**Prerequisite:** INFRA plan must be complete.

---

## File Map

**Created:**
- `lib/ats-scraper.ts` — fetch-based scrapers for Greenhouse, Lever, Ashby public APIs
- `lib/job-scorer.ts` — AI scoring helper (Claude, batched)
- `inngest/functions/job-discovery.ts` — Inngest function: scrape + score all active companies
- `inngest/functions/morning-briefing.ts` — Inngest function: daily digest
- `app/api/admin/companies/route.ts` — GET/POST companies
- `app/api/admin/companies/[id]/route.ts` — PATCH company
- `app/api/admin/jobs/route.ts` — GET job listings with filters
- `app/api/admin/jobs/[id]/route.ts` — PATCH listing status (shortlist/dismiss)
- `app/admin/hunt/page.tsx` — jobs feed (server component)
- `app/admin/hunt/companies/page.tsx` — company watchlist (server component)
- `components/admin/hunt/JobFeed.tsx` — interactive job list (client)
- `components/admin/hunt/CompanyList.tsx` — company manager (client)

---

## Task 1: ATS scraper library

**Files:**
- Create: `lib/ats-scraper.ts`

- [ ] **Step 1: Write the scraper**

```typescript
// lib/ats-scraper.ts
// Fetch-based scrapers for public ATS job board APIs.
// No auth, no Playwright — these are all public endpoints.

export interface RawListing {
  readonly external_id: string;
  readonly external_url: string;
  readonly company: string;
  readonly role: string;
  readonly location: string | null;
  readonly remote_type: 'onsite' | 'hybrid' | 'remote' | null;
  readonly description: string | null;
  readonly posted_at: string | null;
}

// Greenhouse: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
export async function scrapeGreenhouse(slug: string, companyName: string): Promise<RawListing[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, {
    headers: { 'User-Agent': 'whatelz-job-hunter/1.0' },
  });
  if (!res.ok) return [];
  const data = await res.json() as { jobs?: any[] };
  return (data.jobs ?? []).map(j => ({
    external_id:  String(j.id),
    external_url: j.absolute_url ?? `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
    company:      companyName,
    role:         j.title ?? '',
    location:     j.location?.name ?? null,
    remote_type:  detectRemote(j.location?.name),
    description:  j.content ?? null,
    posted_at:    j.updated_at ?? null,
  }));
}

// Lever: GET https://api.lever.co/v0/postings/{slug}?mode=json
export async function scrapeLever(slug: string, companyName: string): Promise<RawListing[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
    headers: { 'User-Agent': 'whatelz-job-hunter/1.0' },
  });
  if (!res.ok) return [];
  const data = await res.json() as any[];
  return (Array.isArray(data) ? data : []).map(j => ({
    external_id:  j.id ?? '',
    external_url: j.hostedUrl ?? `https://jobs.lever.co/${slug}/${j.id}`,
    company:      companyName,
    role:         j.text ?? '',
    location:     j.categories?.location ?? null,
    remote_type:  detectRemote(j.categories?.commitment),
    description:  j.descriptionPlain ?? null,
    posted_at:    j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}

// Ashby: POST https://api.ashbyhq.com/posting-api/job-board/{slug}
export async function scrapeAshby(slug: string, companyName: string): Promise<RawListing[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'whatelz-job-hunter/1.0' },
    body: JSON.stringify({}),
  });
  if (!res.ok) return [];
  const data = await res.json() as { jobPostings?: any[] };
  return (data.jobPostings ?? []).map(j => ({
    external_id:  j.id ?? '',
    external_url: j.jobUrl ?? '',
    company:      companyName,
    role:         j.title ?? '',
    location:     j.locationName ?? null,
    remote_type:  j.isRemote ? 'remote' : 'onsite',
    description:  j.descriptionHtml?.replace(/<[^>]+>/g, '') ?? null,
    posted_at:    j.publishedDate ?? null,
  }));
}

function detectRemote(text: string | null | undefined): 'onsite' | 'hybrid' | 'remote' | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('remote')) return 'remote';
  if (t.includes('hybrid')) return 'hybrid';
  if (t.includes('on-site') || t.includes('onsite') || t.includes('office')) return 'onsite';
  return null;
}

export async function scrapeCompany(
  atsType: string | null,
  atsSlug: string | null,
  companyName: string,
): Promise<RawListing[]> {
  if (!atsType || !atsSlug) return [];
  switch (atsType.toLowerCase()) {
    case 'greenhouse': return scrapeGreenhouse(atsSlug, companyName);
    case 'lever':      return scrapeLever(atsSlug, companyName);
    case 'ashby':      return scrapeAshby(atsSlug, companyName);
    default:           return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ats-scraper.ts
git commit -m "feat(hunt): Greenhouse/Lever/Ashby public ATS scrapers"
```

---

## Task 2: AI job scorer

**Files:**
- Create: `lib/job-scorer.ts`

- [ ] **Step 1: Write the scorer**

```typescript
// lib/job-scorer.ts
import Anthropic from '@anthropic-ai/sdk';
import { listUserProfile } from './supabase-jobs';

const client = new Anthropic();

export interface ScoreResult {
  readonly match_score: number;
  readonly score_breakdown: Record<string, number>;
  readonly score_reasoning: string;
}

let cachedProfile: string | null = null;

async function getProfileContext(): Promise<string> {
  if (cachedProfile) return cachedProfile;
  const profile = await listUserProfile();
  cachedProfile = profile.map(p => `${p.category}/${p.key}: ${p.value}`).join('\n');
  return cachedProfile;
}

export async function scoreListings(
  listings: Array<{ id: string; role: string; company: string; description: string | null }>,
): Promise<Map<string, ScoreResult>> {
  const profileCtx = await getProfileContext();
  const results = new Map<string, ScoreResult>();

  // Score in batches of 10 to keep prompt size manageable
  for (let i = 0; i < listings.length; i += 10) {
    const batch = listings.slice(i, i + 10);
    const jobsText = batch.map((j, idx) =>
      `[${idx}] ${j.company} — ${j.role}\n${(j.description ?? '').slice(0, 800)}`
    ).join('\n\n---\n\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a job-fit scorer. Given a candidate profile and job listings, return a JSON array with one object per listing.

CANDIDATE PROFILE:
${profileCtx}

JOBS TO SCORE:
${jobsText}

Return a JSON array with exactly ${batch.length} objects, one per job (same order), each:
{
  "match_score": 0.0-1.0,
  "score_breakdown": { "skills": 0.0-1.0, "experience": 0.0-1.0, "culture": 0.0-1.0, "location": 0.0-1.0 },
  "score_reasoning": "1-2 sentences"
}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) continue;
    try {
      const scores = JSON.parse(match[0]) as ScoreResult[];
      batch.forEach((j, idx) => { if (scores[idx]) results.set(j.id, scores[idx]); });
    } catch { /* skip malformed batch */ }
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/job-scorer.ts
git commit -m "feat(hunt): AI job scorer using Claude Haiku (batched)"
```

---

## Task 3: Inngest job-discovery function

**Files:**
- Create: `inngest/functions/job-discovery.ts`

- [ ] **Step 1: Confirm Inngest is installed**

```bash
npm list inngest || npm install inngest
```

Check `app/api/inngest/route.ts` exists. If not, check the doublelead pattern and create it:
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { jobDiscovery } from '@/inngest/functions/job-discovery';
import { morningBriefing } from '@/inngest/functions/morning-briefing';

export const { GET, POST, PUT } = serve({ client: inngest, functions: [jobDiscovery, morningBriefing] });
```

Check `inngest/client.ts` exists. If not:
```typescript
// inngest/client.ts
import { Inngest } from 'inngest';
export const inngest = new Inngest({ id: 'whatelz' });
```

- [ ] **Step 2: Write the job-discovery function**

```typescript
// inngest/functions/job-discovery.ts
import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeCompany } from '@/lib/ats-scraper';
import { scoreListings } from '@/lib/job-scorer';
import type { Company } from '@/lib/types/jobs';

export const jobDiscovery = inngest.createFunction(
  { id: 'job-discovery', name: 'Job Discovery' },
  { cron: 'TZ=Asia/Singapore 0 6,12,18 * * *' }, // 6AM, 12PM, 6PM SGT
  async ({ step }) => {
    const companies = await step.run('fetch-companies', async () => {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('id, name, ats_type, ats_slug')
        .eq('status', 'active')
        .not('ats_type', 'is', null)
        .not('ats_slug', 'is', null);
      return (data ?? []) as Pick<Company, 'id' | 'name' | 'ats_type' | 'ats_slug'>[];
    });

    let newListings = 0;

    for (const company of companies) {
      const raw = await step.run(`scrape-${company.id}`, () =>
        scrapeCompany(company.ats_type, company.ats_slug, company.name)
      );
      if (raw.length === 0) continue;

      // Get source_id for this ATS type
      const { data: sourceRow } = await supabaseAdmin
        .from('job_sources')
        .select('id')
        .eq('name', company.ats_type!.toLowerCase())
        .single();
      const source_id = sourceRow?.id ?? null;

      // Upsert listings (skip existing external_ids)
      const toInsert = raw.map(r => ({
        source_id,
        company_id:      company.id,
        external_id:     r.external_id,
        external_url:    r.external_url,
        company:         r.company,
        role:            r.role,
        location:        r.location,
        remote_type:     r.remote_type,
        description:     r.description,
        posted_at:       r.posted_at,
        status:         'new',
        source:         'derived',
      }));

      const { data: inserted } = await supabaseAdmin
        .from('job_listings')
        .upsert(toInsert, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
        .select('id, role, company, description');

      newListings += (inserted ?? []).length;

      // Score newly inserted listings
      const unscored = (inserted ?? []).filter(r => r.id);
      if (unscored.length > 0) {
        const scores = await step.run(`score-${company.id}`, () =>
          scoreListings(unscored.map(r => ({
            id: r.id, role: r.role, company: r.company, description: r.description,
          })))
        );
        for (const [id, score] of scores) {
          await supabaseAdmin
            .from('job_listings')
            .update({
              match_score:     score.match_score,
              score_breakdown: score.score_breakdown,
              score_reasoning: score.score_reasoning,
              // Auto-shortlist high matches
              status: score.match_score >= 0.75 ? 'shortlisted' : 'new',
            })
            .eq('id', id);
        }
      }

      // Update last_checked_at
      await supabaseAdmin
        .from('companies')
        .update({ last_checked_at: new Date().toISOString(), last_fetch_count: raw.length })
        .eq('id', company.id);
    }

    // Record agent run
    await supabaseAdmin.from('agent_runs').insert({
      agent: 'job-discovery',
      status: 'completed',
      finished_at: new Date().toISOString(),
      items_found: newListings,
    });

    return { companiesChecked: companies.length, newListings };
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add inngest/functions/job-discovery.ts inngest/client.ts app/api/inngest/route.ts
git commit -m "feat(hunt): Inngest job-discovery cron function"
```

---

## Task 4: Companies admin UI

**Files:**
- Create: `app/api/admin/companies/route.ts`
- Create: `app/api/admin/companies/[id]/route.ts`
- Create: `app/admin/hunt/companies/page.tsx`
- Create: `components/admin/hunt/CompanyList.tsx`

- [ ] **Step 1: Write companies API**

```typescript
// app/api/admin/companies/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .order('priority')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ companies: data });
}

export async function POST(req: Request) {
  const body = await req.json() as {
    name: string; industry?: string; ats_type?: string;
    ats_slug?: string; careers_url?: string; priority?: number;
  };
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('companies')
    .insert({ ...body, source: 'manual' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data }, { status: 201 });
}
```

```typescript
// app/api/admin/companies/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { error } = await supabaseAdmin
    .from('companies')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write CompanyList client component**

```tsx
// components/admin/hunt/CompanyList.tsx
'use client';

import { useState } from 'react';
import type { Company } from '@/lib/types/jobs';

interface Props { readonly initialCompanies: Company[] }

const ATS_TYPES = ['greenhouse', 'lever', 'ashby', 'workable', 'linkedin', 'other'] as const;
const PRIORITIES = [1, 2, 3, 4, 5] as const;

export function CompanyList({ initialCompanies }: Props) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [adding,    setAdding]    = useState(false);
  const [form,      setForm]      = useState({ name: '', ats_type: 'greenhouse', ats_slug: '', priority: 3 });
  const [saving,    setSaving]    = useState(false);

  async function handleAdd() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json() as { company?: Company };
    if (data.company) {
      setCompanies(prev => [...prev, data.company!].sort((a, b) => a.priority - b.priority));
      setAdding(false);
      setForm({ name: '', ats_type: 'greenhouse', ats_slug: '', priority: 3 });
    }
    setSaving(false);
  }

  async function toggleStatus(id: string, current: Company['status']) {
    const next = current === 'active' ? 'paused' : 'active';
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: next } : c));
  }

  const inputCls = "border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-sm bg-white dark:bg-zinc-900";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{companies.length} companies on watchlist</p>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-sm px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Add company
        </button>
      </div>

      {adding && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Company name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`${inputCls} col-span-2`} />
            <select value={form.ats_type}
              onChange={e => setForm(f => ({ ...f, ats_type: e.target.value }))}
              className={inputCls}>
              {ATS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="ATS slug (e.g. stripe)" value={form.ats_slug}
              onChange={e => setForm(f => ({ ...f, ats_slug: e.target.value }))}
              className={inputCls} />
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
              className={inputCls}>
              {PRIORITIES.map(p => <option key={p} value={p}>Priority {p}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.name}
            className="text-sm px-4 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {companies.map(c => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.name}</p>
              <p className="text-xs text-zinc-400">
                {c.industry ?? '—'} · {c.ats_type ?? 'no ATS'}{c.ats_slug ? ` / ${c.ats_slug}` : ''} · P{c.priority}
              </p>
            </div>
            <button onClick={() => toggleStatus(c.id, c.status)}
              className={`text-xs px-2 py-1 rounded ${
                c.status === 'active'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
                  : 'text-zinc-400'
              }`}>
              {c.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write companies page**

```tsx
// app/admin/hunt/companies/page.tsx
import { supabaseAdmin } from '@/lib/supabase-server';
import { CompanyList } from '@/components/admin/hunt/CompanyList';
import type { Company } from '@/lib/types/jobs';

export default async function CompaniesPage() {
  const { data } = await supabaseAdmin
    .from('companies').select('*').order('priority').order('name');
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Companies</h1>
        <p className="text-sm text-zinc-500 mt-1">Target company watchlist. Active companies are scraped 3× daily.</p>
      </div>
      <CompanyList initialCompanies={(data ?? []) as Company[]} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/companies/ app/admin/hunt/companies/page.tsx components/admin/hunt/CompanyList.tsx
git commit -m "feat(hunt): company watchlist admin UI"
```

---

## Task 5: Jobs feed admin UI

**Files:**
- Create: `app/api/admin/jobs/route.ts`
- Create: `app/api/admin/jobs/[id]/route.ts`
- Create: `app/admin/hunt/page.tsx`
- Create: `components/admin/hunt/JobFeed.tsx`

- [ ] **Step 1: Write jobs API**

```typescript
// app/api/admin/jobs/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'new';
  const { data, error } = await supabaseAdmin
    .from('job_listings')
    .select('*')
    .eq('status', status)
    .order('match_score', { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data });
}
```

```typescript
// app/api/admin/jobs/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await req.json() as { status: string };
  const { error } = await supabaseAdmin
    .from('job_listings').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write JobFeed client component**

```tsx
// components/admin/hunt/JobFeed.tsx
'use client';

import { useState } from 'react';
import type { JobListing } from '@/lib/types/jobs';

interface Props { readonly initialListings: JobListing[] }

export function JobFeed({ initialListings }: Props) {
  const [listings, setListings] = useState(initialListings);
  const [acting,   setActing]   = useState<string | null>(null);

  async function act(id: string, status: 'shortlisted' | 'rejected_by_user') {
    setActing(id);
    await fetch(`/api/admin/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setListings(prev => prev.filter(l => l.id !== id));
    setActing(null);
  }

  if (listings.length === 0) {
    return <p className="text-sm text-zinc-400">No new listings. Discovery runs 3× daily.</p>;
  }

  return (
    <div className="space-y-3">
      {listings.map(l => (
        <div key={l.id} className="border border-zinc-200 dark:border-zinc-800 rounded p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {l.company} — {l.role}
              </p>
              <p className="text-xs text-zinc-400">
                {l.location ?? 'Unknown location'} · {l.remote_type ?? 'onsite'}
                {l.match_score !== null && ` · Score: ${Math.round(l.match_score * 100)}%`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => act(l.id, 'shortlisted')}
                disabled={acting === l.id}
                className="text-xs px-3 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                Shortlist
              </button>
              <button
                onClick={() => act(l.id, 'rejected_by_user')}
                disabled={acting === l.id}
                className="text-xs px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-400 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
          {l.score_reasoning && (
            <p className="text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2">
              {l.score_reasoning}
            </p>
          )}
          {l.external_url && (
            <a href={l.external_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600">
              View listing →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write hunt page**

```tsx
// app/admin/hunt/page.tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { JobFeed } from '@/components/admin/hunt/JobFeed';
import type { JobListing } from '@/lib/types/jobs';

export default async function HuntPage() {
  const { data } = await supabaseAdmin
    .from('job_listings')
    .select('*')
    .eq('status', 'new')
    .order('match_score', { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Hunt</h1>
          <p className="text-sm text-zinc-500 mt-1">New listings, scored by AI. Shortlist or dismiss.</p>
        </div>
        <Link href="/admin/hunt/companies"
          className="text-sm px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
          Companies →
        </Link>
      </div>
      <JobFeed initialListings={(data ?? []) as JobListing[]} />
    </div>
  );
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/jobs/ app/admin/hunt/page.tsx components/admin/hunt/JobFeed.tsx
git commit -m "feat(hunt): job feed admin UI with shortlist/dismiss actions"
```

---

**HUNT plan complete. ATS scrapers, Inngest discovery cron, and companies/jobs admin UI are all live.**
