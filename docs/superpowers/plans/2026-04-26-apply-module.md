# APPLY Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the APPLY module in `/admin` — AI-assisted resume builder, application pipeline view, and review queue where Edmund approves AI-drafted applications before auto-submission.

**Architecture:** Server components read from Supabase public schema directly. Client components handle interactive editing (resume builder, approval flow). AI drafting calls internal API routes backed by Claude (`claude-sonnet-4-6`). Resume source of truth is MYSTORY doc + `user_profile` table. Applications flow: `draft → ready → submitted`.

**Tech Stack:** Next.js 16 App Router, Supabase (public schema), Anthropic SDK, Tailwind CSS v4, Clerk (already wired)

**Prerequisite:** INFRA plan must be complete (tables created, data migrated).

---

## File Map

**Created:**
- `lib/types/jobs.ts` — TypeScript types for all job-tracking tables
- `lib/supabase-jobs.ts` — typed Supabase helpers for job-tracking tables
- `components/admin/AdminSidebar.tsx` — sidebar nav for all admin sections
- `app/admin/apply/page.tsx` — application pipeline (server component)
- `app/admin/apply/resume/page.tsx` — resume builder page
- `components/admin/apply/ApplicationPipeline.tsx` — kanban pipeline (client)
- `components/admin/apply/ResumeBuilder.tsx` — AI-assisted resume editor (client)
- `app/api/admin/resume/draft/route.ts` — POST: AI drafts resume from MYSTORY + user_profile
- `app/api/admin/resume/route.ts` — GET/POST: list and create resume variants
- `app/api/admin/resume/[id]/route.ts` — PATCH/DELETE: update or delete a resume
- `app/api/admin/applications/route.ts` — GET/POST: list and create applications
- `app/api/admin/applications/[id]/route.ts` — PATCH: update status, cover letter, bullets

**Modified:**
- `app/admin/layout.tsx` — add `AdminSidebar` inside the existing Clerk wrapper
- `app/admin/page.tsx` — simplify to a pipeline summary dashboard

---

## Task 1: TypeScript types for job-tracking tables

**Files:**
- Create: `lib/types/jobs.ts`

- [ ] **Step 1: Write the types file**

```typescript
// lib/types/jobs.ts
export type ApplicationStatus =
  | 'draft' | 'ready' | 'submitted' | 'acknowledged'
  | 'interviewing' | 'offered' | 'accepted' | 'rejected'
  | 'withdrawn' | 'ghosted';

export type JobListing = {
  readonly id: string;
  readonly source_id: string | null;
  readonly company_id: string | null;
  readonly external_id: string | null;
  readonly external_url: string | null;
  readonly company: string;
  readonly role: string;
  readonly location: string | null;
  readonly remote_type: 'onsite' | 'hybrid' | 'remote' | null;
  readonly salary_min: number | null;
  readonly salary_max: number | null;
  readonly salary_currency: string;
  readonly description: string | null;
  readonly match_score: number | null;
  readonly score_reasoning: string | null;
  readonly status: 'new' | 'shortlisted' | 'applying' | 'applied' | 'rejected_by_user' | 'expired';
  readonly discovered_at: string;
};

export type Application = {
  readonly id: string;
  readonly listing_id: string | null;
  readonly resume_id: string | null;
  readonly cover_letter: string | null;
  readonly resume_bullets: Record<string, string>[] | null;
  readonly status: ApplicationStatus;
  readonly applied_at: string | null;
  readonly applied_via: string | null;
  readonly response_status: string | null;
  readonly follow_up_at: string | null;
  readonly follow_up_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  // Joined
  readonly job_listings?: Pick<JobListing, 'company' | 'role' | 'external_url'> | null;
};

export type ResumeStructured = {
  readonly summary: string;
  readonly skills: string[];
  readonly experience: Array<{
    readonly company: string;
    readonly role: string;
    readonly period: string;
    readonly bullets: string[];
    readonly technologies: string[];
  }>;
  readonly education: Array<{ readonly institution: string; readonly degree: string; readonly period: string }>;
  readonly achievements: string[];
};

export type Resume = {
  readonly id: string;
  readonly label: string;
  readonly raw_text: string;
  readonly structured: ResumeStructured;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
};

export type Company = {
  readonly id: string;
  readonly name: string;
  readonly industry: string | null;
  readonly website: string | null;
  readonly careers_url: string | null;
  readonly ats_type: string | null;
  readonly ats_slug: string | null;
  readonly priority: number;
  readonly status: 'active' | 'paused' | 'archived';
};

export type UserProfileEntry = {
  readonly id: string;
  readonly category: string;
  readonly key: string;
  readonly value: string;
  readonly source: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/jobs.ts
git commit -m "feat(apply): add job-tracking TypeScript types"
```

---

## Task 2: Supabase helpers for job-tracking tables

**Files:**
- Create: `lib/supabase-jobs.ts`

- [ ] **Step 1: Write the helpers**

```typescript
// lib/supabase-jobs.ts
import { supabaseAdmin } from './supabase-server';
import type { Application, ApplicationStatus, JobListing, Resume, UserProfileEntry } from './types/jobs';

// ── Applications ──────────────────────────────────────────────────────────────

export async function listApplications(): Promise<Application[]> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, job_listings(company, role, external_url)')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`listApplications: ${error.message}`);
  return (data ?? []) as Application[];
}

export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, job_listings(company, role, external_url)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Application;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`updateApplicationStatus: ${error.message}`);

  await supabaseAdmin.from('application_events').insert({
    application_id: id,
    event_type: 'status_change',
    new_value: status,
    source: 'user',
  });
}

export async function updateApplicationDraft(
  id: string,
  fields: { cover_letter?: string; resume_bullets?: Record<string, string>[] },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('applications')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`updateApplicationDraft: ${error.message}`);
}

// ── Resumes ───────────────────────────────────────────────────────────────────

export async function listResumes(): Promise<Resume[]> {
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listResumes: ${error.message}`);
  return (data ?? []) as Resume[];
}

export async function getActiveResume(): Promise<Resume | null> {
  const { data } = await supabaseAdmin
    .from('resumes')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();
  return data as Resume | null;
}

export async function saveResume(
  label: string,
  raw_text: string,
  structured: object,
): Promise<Resume> {
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .insert({ label, raw_text, structured, is_active: false })
    .select()
    .single();
  if (error) throw new Error(`saveResume: ${error.message}`);
  return data as Resume;
}

// ── User profile ──────────────────────────────────────────────────────────────

export async function listUserProfile(): Promise<UserProfileEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('user_profile')
    .select('*')
    .order('category')
    .order('sort_order');
  if (error) throw new Error(`listUserProfile: ${error.message}`);
  return (data ?? []) as UserProfileEntry[];
}

// ── Job listings (for Apply module — shortlisted only) ────────────────────────

export async function listShortlistedListings(): Promise<JobListing[]> {
  const { data, error } = await supabaseAdmin
    .from('job_listings')
    .select('*')
    .eq('status', 'shortlisted')
    .order('match_score', { ascending: false });
  if (error) throw new Error(`listShortlistedListings: ${error.message}`);
  return (data ?? []) as JobListing[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase-jobs.ts
git commit -m "feat(apply): Supabase helpers for job-tracking tables"
```

---

## Task 3: Admin layout with sidebar navigation

**Files:**
- Create: `components/admin/AdminSidebar.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Read the current layout**

Read `app/admin/layout.tsx` — note the existing ClerkProvider wrapper and structure.

- [ ] **Step 2: Write AdminSidebar**

```tsx
// components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/apply',    label: 'Apply'     },
  { href: '/admin/hunt',     label: 'Hunt'      },
  { href: '/admin/listen',   label: 'Listen'    },
  { href: '/admin/presence', label: 'Presence'  },
] as const;

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-800 min-h-screen p-4">
      <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-4">WHATELZ</p>
      <ul className="space-y-1">
        {NAV.map(({ href, label }) => {
          const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: Update admin layout to include sidebar**

Read `app/admin/layout.tsx` first. Replace the inner content wrapper (inside SignedIn) with:

```tsx
// app/admin/layout.tsx — replace the body/children section
// Keep ClerkProvider and SignedIn/SignedOut wrappers exactly as-is.
// Only change: wrap children in a flex row with the sidebar.

import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Inside the SignedIn block, change children rendering to:
<div className="flex min-h-screen">
  <AdminSidebar />
  <main className="flex-1 p-6 overflow-auto">
    {children}
  </main>
</div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminSidebar.tsx app/admin/layout.tsx
git commit -m "feat(apply): admin sidebar navigation"
```

---

## Task 4: AI resume draft API

**Files:**
- Create: `app/api/admin/resume/draft/route.ts`

- [ ] **Step 1: Ensure Anthropic SDK is installed**

```bash
npm list @anthropic-ai/sdk || npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Write the draft endpoint**

```typescript
// app/api/admin/resume/draft/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readDoc } from '@/lib/website-docs';
import { listUserProfile } from '@/lib/supabase-jobs';

const client = new Anthropic();

export async function POST(req: Request) {
  const { narrative = 'AI Engineer' } = await req.json() as { narrative?: string };

  const [mystory, profile] = await Promise.all([
    readDoc('MYSTORY'),
    listUserProfile(),
  ]);

  const profileText = profile
    .map(p => `${p.category}/${p.key}: ${p.value}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are a professional resume writer. You write concise, impactful resumes for software engineers.
Rules:
- Every fact must come from the provided MYSTORY or profile data. Do not invent anything.
- Lead with one clear narrative thread: "${narrative}".
- Pick the top 3-4 experiences and 5-6 skills that support the narrative. Deprioritise the rest.
- Bullets must start with a strong action verb and include a quantified outcome where the data supports it.
- No "responsible for" or "worked on" — only impact statements.
- Return a JSON object matching this structure exactly:
{
  "summary": "string (2-3 sentences, first person, narrative-first)",
  "skills": ["string", ...],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "period": "string",
      "bullets": ["string", ...],
      "technologies": ["string", ...]
    }
  ],
  "education": [{ "institution": "string", "degree": "string", "period": "string" }],
  "achievements": ["string", ...]
}`,
    messages: [{
      role: 'user',
      content: `MYSTORY:\n${mystory}\n\nPROFILE DATA:\n${profileText}\n\nNarrative angle: ${narrative}\n\nDraft the resume JSON now.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'ai_parse_failed' }, { status: 500 });
  }

  let structured: object;
  try {
    structured = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: 'ai_parse_failed' }, { status: 500 });
  }

  return NextResponse.json({ structured });
}
```

- [ ] **Step 3: Verify ANTHROPIC_API_KEY is in .env.local**

```bash
grep ANTHROPIC_API_KEY .env.local
```

If missing, add it: `ANTHROPIC_API_KEY=sk-ant-...`

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/resume/draft/route.ts
git commit -m "feat(apply): AI resume draft API endpoint"
```

---

## Task 5: Resume CRUD API

**Files:**
- Create: `app/api/admin/resume/route.ts`
- Create: `app/api/admin/resume/[id]/route.ts`

- [ ] **Step 1: Write list/create endpoint**

```typescript
// app/api/admin/resume/route.ts
import { NextResponse } from 'next/server';
import { listResumes, saveResume } from '@/lib/supabase-jobs';
import type { ResumeStructured } from '@/lib/types/jobs';

export async function GET() {
  const resumes = await listResumes();
  return NextResponse.json({ resumes });
}

export async function POST(req: Request) {
  const { label, raw_text, structured } = await req.json() as {
    label: string;
    raw_text: string;
    structured: ResumeStructured;
  };
  if (!label || !raw_text || !structured) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const resume = await saveResume(label, raw_text, structured);
  return NextResponse.json({ resume }, { status: 201 });
}
```

- [ ] **Step 2: Write update endpoint**

```typescript
// app/api/admin/resume/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json() as {
    label?: string;
    raw_text?: string;
    structured?: object;
    is_active?: boolean;
  };
  const { error } = await supabaseAdmin
    .from('resumes')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/resume/route.ts app/api/admin/resume/[id]/route.ts
git commit -m "feat(apply): resume CRUD API routes"
```

---

## Task 6: Applications API

**Files:**
- Create: `app/api/admin/applications/route.ts`
- Create: `app/api/admin/applications/[id]/route.ts`

- [ ] **Step 1: Write list endpoint**

```typescript
// app/api/admin/applications/route.ts
import { NextResponse } from 'next/server';
import { listApplications } from '@/lib/supabase-jobs';

export async function GET() {
  const applications = await listApplications();
  return NextResponse.json({ applications });
}
```

- [ ] **Step 2: Write update endpoint**

```typescript
// app/api/admin/applications/[id]/route.ts
import { NextResponse } from 'next/server';
import { updateApplicationStatus, updateApplicationDraft } from '@/lib/supabase-jobs';
import type { ApplicationStatus } from '@/lib/types/jobs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json() as {
    status?: ApplicationStatus;
    cover_letter?: string;
    resume_bullets?: Record<string, string>[];
  };

  if (body.status) {
    await updateApplicationStatus(id, body.status);
  }
  if (body.cover_letter !== undefined || body.resume_bullets !== undefined) {
    await updateApplicationDraft(id, {
      cover_letter: body.cover_letter,
      resume_bullets: body.resume_bullets,
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/applications/route.ts app/api/admin/applications/[id]/route.ts
git commit -m "feat(apply): applications API routes"
```

---

## Task 7: Resume builder page

**Files:**
- Create: `app/admin/apply/resume/page.tsx`
- Create: `components/admin/apply/ResumeBuilder.tsx`

- [ ] **Step 1: Write the ResumeBuilder client component**

```tsx
// components/admin/apply/ResumeBuilder.tsx
'use client';

import { useState } from 'react';
import type { Resume, ResumeStructured } from '@/lib/types/jobs';

interface Props {
  readonly initialResumes: Resume[];
}

const NARRATIVES = ['AI Engineer', 'Full-Stack Engineer', 'Data Engineer', 'Technical Co-Founder'] as const;

export function ResumeBuilder({ initialResumes }: Props) {
  const [resumes, setResumes]       = useState(initialResumes);
  const [narrative, setNarrative]   = useState<string>('AI Engineer');
  const [drafting, setDrafting]     = useState(false);
  const [draft, setDraft]           = useState<ResumeStructured | null>(null);
  const [label, setLabel]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/resume/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative }),
      });
      const data = await res.json() as { structured?: ResumeStructured; error?: string };
      if (!res.ok || !data.structured) {
        setError(data.error ?? 'Draft failed');
        return;
      }
      setDraft(data.structured);
      setLabel(`${narrative} — ${new Date().toLocaleDateString()}`);
    } finally {
      setDrafting(false);
    }
  }

  async function handleSave() {
    if (!draft || !label) return;
    setSaving(true);
    try {
      const raw = [
        draft.summary,
        '\nSKILLS\n' + draft.skills.join(', '),
        '\nEXPERIENCE\n' + draft.experience.map(e =>
          `${e.company} — ${e.role} (${e.period})\n` + e.bullets.map(b => `• ${b}`).join('\n')
        ).join('\n\n'),
        '\nEDUCATION\n' + draft.education.map(e => `${e.institution} — ${e.degree} (${e.period})`).join('\n'),
        '\nACHIEVEMENTS\n' + draft.achievements.join('\n'),
      ].join('\n');

      const res = await fetch('/api/admin/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, raw_text: raw, structured: draft }),
      });
      const data = await res.json() as { resume?: Resume };
      if (data.resume) {
        setResumes(prev => [data.resume!, ...prev]);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Draft controls */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded p-4 space-y-4">
        <h2 className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Generate Draft</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            className="border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm bg-white dark:bg-zinc-900"
          >
            {NARRATIVES.map(n => <option key={n}>{n}</option>)}
          </select>
          <button
            onClick={handleDraft}
            disabled={drafting}
            className="px-4 py-2 text-sm rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
          >
            {drafting ? 'Drafting…' : 'AI Draft'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Draft preview & save */}
      {draft && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label (e.g. AI Engineer — Apr 2026)"
              className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm bg-white dark:bg-zinc-900"
            />
            <button
              onClick={handleSave}
              disabled={saving || !label}
              className="px-4 py-2 text-sm rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Resume'}
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-mono text-xs text-zinc-400 mb-1">SUMMARY</p>
              <p className="text-zinc-700 dark:text-zinc-300">{draft.summary}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-zinc-400 mb-1">SKILLS</p>
              <p className="text-zinc-700 dark:text-zinc-300">{draft.skills.join(' · ')}</p>
            </div>
            {draft.experience.map(exp => (
              <div key={exp.company}>
                <p className="font-mono text-xs text-zinc-400 mb-1">
                  {exp.company} — {exp.role} ({exp.period})
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {exp.bullets.map((b, i) => (
                    <li key={i} className="text-zinc-700 dark:text-zinc-300">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved resumes */}
      {resumes.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Saved Resumes</h2>
          {resumes.map(r => (
            <div key={r.id} className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.label}</p>
                <p className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              {r.is_active && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">active</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the resume builder page**

```tsx
// app/admin/apply/resume/page.tsx
import { listResumes } from '@/lib/supabase-jobs';
import { ResumeBuilder } from '@/components/admin/apply/ResumeBuilder';

export default async function ResumePage() {
  const resumes = await listResumes();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Resume</h1>
        <p className="text-sm text-zinc-500 mt-1">
          AI drafts from your MYSTORY and profile. You edit. You save.
        </p>
      </div>
      <ResumeBuilder initialResumes={resumes} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/apply/ResumeBuilder.tsx app/admin/apply/resume/page.tsx
git commit -m "feat(apply): AI-assisted resume builder"
```

---

## Task 8: Application pipeline page

**Files:**
- Create: `app/admin/apply/page.tsx`
- Create: `components/admin/apply/ApplicationPipeline.tsx`

- [ ] **Step 1: Write the ApplicationPipeline client component**

```tsx
// components/admin/apply/ApplicationPipeline.tsx
'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus } from '@/lib/types/jobs';

const STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: 'draft',        label: 'Draft'        },
  { status: 'ready',        label: 'Ready'        },
  { status: 'submitted',    label: 'Submitted'    },
  { status: 'acknowledged', label: 'Acknowledged' },
  { status: 'interviewing', label: 'Interviewing' },
  { status: 'offered',      label: 'Offered'      },
  { status: 'rejected',     label: 'Rejected'     },
  { status: 'ghosted',      label: 'Ghosted'      },
];

interface Props {
  readonly initialApplications: Application[];
}

export function ApplicationPipeline({ initialApplications }: Props) {
  const [applications, setApplications] = useState(initialApplications);
  const [updating, setUpdating]         = useState<string | null>(null);

  async function advance(id: string, next: ApplicationStatus) {
    setUpdating(id);
    await fetch(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status: next } : a)
    );
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      {STAGES.map(({ status, label }) => {
        const apps = applications.filter(a => a.status === status);
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">{label}</span>
              <span className="text-xs text-zinc-400">({apps.length})</span>
            </div>
            {apps.length === 0 ? (
              <p className="text-xs text-zinc-300 dark:text-zinc-600 pl-2">—</p>
            ) : (
              <div className="space-y-2">
                {apps.map(app => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {app.job_listings?.company ?? 'Unknown'} — {app.job_listings?.role ?? '—'}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {app.applied_at ? `Applied ${new Date(app.applied_at).toLocaleDateString()}` : 'Not yet sent'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {status === 'ready' && (
                        <button
                          onClick={() => advance(app.id, 'submitted')}
                          disabled={updating === app.id}
                          className="text-xs px-3 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
                        >
                          {updating === app.id ? '…' : 'Mark Submitted'}
                        </button>
                      )}
                      {status === 'draft' && (
                        <button
                          onClick={() => advance(app.id, 'ready')}
                          disabled={updating === app.id}
                          className="text-xs px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
                        >
                          {updating === app.id ? '…' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write the apply page**

```tsx
// app/admin/apply/page.tsx
import Link from 'next/link';
import { listApplications } from '@/lib/supabase-jobs';
import { ApplicationPipeline } from '@/components/admin/apply/ApplicationPipeline';

export default async function ApplyPage() {
  const applications = await listApplications();
  const ready = applications.filter(a => a.status === 'ready').length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Apply</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {ready > 0
              ? `${ready} application${ready > 1 ? 's' : ''} ready to send.`
              : 'No applications ready to send.'}
          </p>
        </div>
        <Link
          href="/admin/apply/resume"
          className="text-sm px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Resume Builder →
        </Link>
      </div>
      <ApplicationPipeline initialApplications={applications} />
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: all routes compile cleanly.

- [ ] **Step 4: Commit**

```bash
git add components/admin/apply/ApplicationPipeline.tsx app/admin/apply/page.tsx
git commit -m "feat(apply): application pipeline page with stage view and approval flow"
```

---

**APPLY plan complete. Resume builder and application pipeline are live in `/admin/apply`.**
