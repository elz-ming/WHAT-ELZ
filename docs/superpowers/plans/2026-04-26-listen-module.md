# LISTEN Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the LISTEN module — Gmail API integration that watches `elz.work22@gmail.com` for job-related emails, matches them to applications via domain-matching, updates application status, and surfaces threads in the admin UI.

**Architecture:** Gmail API (OAuth2, not IMAP) polls for new messages on an Inngest schedule. Each email is classified (interview invite / rejection / confirmation / outreach) and linked to an application by matching the sender domain to a company name. Thread viewer in `/admin/listen` shows email threads per application.

**Tech Stack:** Next.js 16 App Router, Inngest, Supabase (public schema), googleapis (`gmail` v1), Tailwind CSS v4

**Prerequisite:** INFRA plan must be complete. HUNT plan should be complete (companies table needed for domain matching).

---

## File Map

**Created:**
- `lib/gmail.ts` — Gmail API client + helpers (list messages, get thread, send)
- `lib/email-classifier.ts` — classify emails by subject line (regex, no LLM needed)
- `lib/domain-matcher.ts` — map sender domain → company → application
- `inngest/functions/email-sync.ts` — Inngest function: Gmail poll + classify + link
- `inngest/functions/follow-up-check.ts` — Inngest function: flag overdue follow-ups
- `app/api/admin/emails/route.ts` — GET emails with application linkage
- `app/api/admin/emails/[id]/route.ts` — PATCH: mark read, link to application
- `app/admin/listen/page.tsx` — email thread viewer (server component)
- `components/admin/listen/EmailThread.tsx` — thread list and detail (client)

**Modified:**
- `inngest/functions/` — register new functions in `app/api/inngest/route.ts`
- `app/admin/layout.tsx` — already has Listen in sidebar from APPLY plan

---

## Task 1: Gmail API credentials

**Files:** none (credential setup only)

- [ ] **Step 1: Enable Gmail API in Google Cloud**

1. Go to `console.cloud.google.com`
2. Select or create project `whatelz`
3. APIs & Services → Enable APIs → enable `Gmail API`

- [ ] **Step 2: Create OAuth credentials**

APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID:
- Application type: Web application
- Authorised redirect URIs: `http://localhost:3100/api/auth/gmail/callback`

Download the JSON. Note `client_id` and `client_secret`.

- [ ] **Step 3: Add env vars**

Add to `.env.local`:
```
GOOGLE_CLIENT_ID=<from JSON>
GOOGLE_CLIENT_SECRET=<from JSON>
GOOGLE_REFRESH_TOKEN=<get in step 4>
```

- [ ] **Step 4: Get refresh token (one-time)**

```bash
npx tsx scripts/get-gmail-token.ts
```

Create the script first:
```typescript
// scripts/get-gmail-token.ts
// Run once to get a refresh token. Paste it into .env.local.
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3100/api/auth/gmail/callback',
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       ['https://www.googleapis.com/auth/gmail.readonly'],
});

console.log('Open this URL and authorise:');
console.log(url);
console.log('\nThen run: GET http://localhost:3100/api/auth/gmail/callback?code=<CODE>');
console.log('Copy the refresh_token from the response.');
```

Create the callback route to complete OAuth:
```typescript
// app/api/auth/gmail/callback/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'no code' }, { status: 400 });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3100/api/auth/gmail/callback',
  );
  const { tokens } = await oauth2Client.getToken(code);
  // Copy refresh_token to .env.local as GOOGLE_REFRESH_TOKEN
  return NextResponse.json({ refresh_token: tokens.refresh_token });
}
```

- [ ] **Step 5: Install googleapis**

```bash
npm list googleapis || npm install googleapis
```

- [ ] **Step 6: Add refresh token to Vercel**

```bash
echo "<refresh-token>" | vercel env add GOOGLE_REFRESH_TOKEN preview --yes
echo "<client-id>"     | vercel env add GOOGLE_CLIENT_ID preview --yes
echo "<client-secret>" | vercel env add GOOGLE_CLIENT_SECRET preview --yes
```

---

## Task 2: Gmail helper library

**Files:**
- Create: `lib/gmail.ts`

- [ ] **Step 1: Write the Gmail helper**

```typescript
// lib/gmail.ts
import { google } from 'googleapis';

function getGmailClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2 });
}

export interface GmailMessage {
  readonly messageId:   string;
  readonly threadId:    string;
  readonly from:        string;
  readonly to:          string;
  readonly subject:     string;
  readonly bodyText:    string;
  readonly receivedAt:  string;
  readonly direction:   'inbound' | 'outbound';
}

function decodeBase64(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getHeader(headers: any[], name: string): string {
  return headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractText(payload: any): string {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data);
  }
  return '';
}

export async function listNewMessages(sinceEpochMs: number): Promise<GmailMessage[]> {
  const gmail   = getGmailClient();
  const sinceS  = Math.floor(sinceEpochMs / 1000);
  const results: GmailMessage[] = [];

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q:      `after:${sinceS}`,
    maxResults: 100,
  });

  for (const m of listRes.data.messages ?? []) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
    const headers = msg.data.payload?.headers ?? [];
    const from    = getHeader(headers, 'From');
    const to      = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const date    = getHeader(headers, 'Date');
    const body    = extractText(msg.data.payload ?? {});
    const direction: 'inbound' | 'outbound' =
      to.includes('elz.work22@gmail.com') && !from.includes('elz.work22@gmail.com')
        ? 'inbound' : 'outbound';

    results.push({
      messageId:  m.id!,
      threadId:   m.threadId!,
      from, to, subject,
      bodyText:   body.slice(0, 4000),
      receivedAt: new Date(date).toISOString(),
      direction,
    });
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/gmail.ts scripts/get-gmail-token.ts app/api/auth/gmail/callback/route.ts
git commit -m "feat(listen): Gmail API helper library"
```

---

## Task 3: Email classifier and domain matcher

**Files:**
- Create: `lib/email-classifier.ts`
- Create: `lib/domain-matcher.ts`

- [ ] **Step 1: Write email classifier (regex, no LLM)**

```typescript
// lib/email-classifier.ts
// Pure regex classification — fast, cheap, deterministic.

export type EmailClass =
  | 'interview_invite'
  | 'rejection'
  | 'confirmation'
  | 'recruiter_outreach'
  | 'unknown';

const RULES: Array<{ pattern: RegExp; class: EmailClass }> = [
  { pattern: /interview|schedule.*call|let.*s.*chat|meet.*discuss/i, class: 'interview_invite' },
  { pattern: /unfortunately|not.*moving forward|other candidates|regret.*inform|not.*selected/i, class: 'rejection' },
  { pattern: /application.*received|thank.*applying|successfully.*submitted|received.*application/i, class: 'confirmation' },
  { pattern: /opportunity|open.*position|hiring|recruiter|we.*found.*your.*profile/i, class: 'recruiter_outreach' },
];

export function classifyEmail(subject: string, bodyText: string): EmailClass {
  const text = `${subject} ${bodyText.slice(0, 500)}`;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.class;
  }
  return 'unknown';
}
```

- [ ] **Step 2: Write domain matcher**

```typescript
// lib/domain-matcher.ts
// Match sender email domain to a company, then to an open application.

import { supabaseAdmin } from './supabase-server';

function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match?.[1]?.toLowerCase().trim() ?? '';
}

function domainToCompanyHint(domain: string): string {
  // Strip TLD and common subdomains to get company slug
  return domain
    .replace(/\.(com|io|co|ai|sg|net|org|xyz)(\.[a-z]{2})?$/, '')
    .replace(/^(mail|jobs|careers|recruiting|hr|noreply|no-reply)\./, '')
    .toLowerCase();
}

export async function matchEmailToApplication(
  fromAddress: string,
): Promise<{ companyId: string | null; applicationId: string | null }> {
  const domain = extractDomain(fromAddress);
  if (!domain) return { companyId: null, applicationId: null };

  const hint = domainToCompanyHint(domain);

  // Find company by domain hint (fuzzy name match)
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .ilike('name', `%${hint}%`)
    .limit(5);

  const company = companies?.[0] ?? null;
  if (!company) return { companyId: null, applicationId: null };

  // Find the most recent non-terminal application for that company
  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('id, job_listings(company_id)')
    .in('status', ['submitted', 'acknowledged', 'interviewing'])
    .order('created_at', { ascending: false })
    .limit(20);

  const linked = (apps ?? []).find(
    (a: any) => a.job_listings?.company_id === company.id
  );

  return {
    companyId:     company.id,
    applicationId: linked?.id ?? null,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/email-classifier.ts lib/domain-matcher.ts
git commit -m "feat(listen): email classifier (regex) and domain matcher"
```

---

## Task 4: Inngest email-sync and follow-up functions

**Files:**
- Create: `inngest/functions/email-sync.ts`
- Create: `inngest/functions/follow-up-check.ts`
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Write email-sync Inngest function**

```typescript
// inngest/functions/email-sync.ts
import { inngest }              from '../client';
import { supabaseAdmin }        from '@/lib/supabase-server';
import { listNewMessages }      from '@/lib/gmail';
import { classifyEmail }        from '@/lib/email-classifier';
import { matchEmailToApplication } from '@/lib/domain-matcher';

export const emailSync = inngest.createFunction(
  { id: 'email-sync', name: 'Email Sync' },
  { cron: 'TZ=Asia/Singapore */30 * * * *' }, // every 30 min
  async ({ step }) => {
    // Get last sync timestamp from system_config
    const { data: cfg } = await supabaseAdmin
      .from('system_config').select('value').eq('key', 'email_last_sync_at').single();
    const sinceMs = cfg?.value ? new Date(cfg.value).getTime() : Date.now() - 24 * 3600 * 1000;

    const messages = await step.run('fetch-gmail', () => listNewMessages(sinceMs));

    let linked = 0;

    for (const msg of messages) {
      // Skip if already stored
      const { count } = await supabaseAdmin
        .from('emails').select('id', { count: 'exact', head: true }).eq('message_id', msg.messageId);
      if ((count ?? 0) > 0) continue;

      const emailClass = classifyEmail(msg.subject, msg.bodyText);

      const { companyId, applicationId } = msg.direction === 'inbound'
        ? await step.run(`match-${msg.messageId}`, () => matchEmailToApplication(msg.from))
        : { companyId: null, applicationId: null };

      // Get email account id
      const { data: acct } = await supabaseAdmin
        .from('email_accounts').select('id').eq('email', 'elz.work22@gmail.com').single();

      const { data: inserted } = await supabaseAdmin.from('emails').insert({
        account_id:     acct?.id ?? null,
        application_id: applicationId,
        message_id:     msg.messageId,
        thread_id:      msg.threadId,
        from_address:   msg.from,
        to_address:     msg.to,
        subject:        msg.subject,
        body_text:      msg.bodyText,
        direction:      msg.direction,
        is_flagged:     emailClass !== 'unknown',
        received_at:    msg.receivedAt,
      }).select('id').single();

      // Log event on application if linked
      if (applicationId && inserted) {
        linked++;
        await supabaseAdmin.from('application_events').insert({
          application_id: applicationId,
          event_type:     `email_received`,
          new_value:      emailClass,
          details:        { email_id: inserted.id, subject: msg.subject, from: msg.from },
          source:         'email_listener',
        });

        // Update application status based on classification
        const statusMap: Record<string, string> = {
          interview_invite: 'interviewing',
          rejection:        'rejected',
          confirmation:     'acknowledged',
        };
        const newStatus = statusMap[emailClass];
        if (newStatus) {
          await supabaseAdmin.from('applications')
            .update({ response_status: emailClass, last_response_at: msg.receivedAt, status: newStatus })
            .eq('id', applicationId);
        }

        // Create notification
        await supabaseAdmin.from('notifications').insert({
          module:      'LISTEN',
          title:       `${emailClass.replace(/_/g, ' ')}: ${msg.from.split('<')[0].trim()}`,
          body:        msg.subject,
          priority:    emailClass === 'interview_invite' ? 'high' : 'normal',
          action_type: 'open_application',
          action_id:   applicationId,
        });
      }
    }

    // Update last sync timestamp
    await supabaseAdmin.from('system_config')
      .upsert({ key: 'email_last_sync_at', value: new Date().toISOString() });

    return { messagesProcessed: messages.length, linked };
  },
);
```

- [ ] **Step 2: Write follow-up-check Inngest function**

```typescript
// inngest/functions/follow-up-check.ts
import { inngest }       from '../client';
import { supabaseAdmin } from '@/lib/supabase-server';

export const followUpCheck = inngest.createFunction(
  { id: 'follow-up-check', name: 'Follow-up Check' },
  { cron: 'TZ=Asia/Singapore 0 9 * * *' }, // 9AM SGT daily
  async () => {
    const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

    // Find submitted applications with no response after 14 days
    const { data: overdue } = await supabaseAdmin
      .from('applications')
      .select('id, job_listings(company, role)')
      .eq('status', 'submitted')
      .is('response_status', null)
      .lt('applied_at', cutoff);

    for (const app of overdue ?? []) {
      const listing = (app as any).job_listings;
      await supabaseAdmin.from('notifications').insert({
        module:      'LISTEN',
        title:       `Follow up: ${listing?.company ?? 'Unknown'}`,
        body:        `${listing?.role ?? 'Role'} — no response in 14 days`,
        priority:    'normal',
        action_type: 'open_application',
        action_id:   app.id,
      });
    }

    return { overdueCount: (overdue ?? []).length };
  },
);
```

- [ ] **Step 3: Register new functions in Inngest route**

Read `app/api/inngest/route.ts`. Add `emailSync` and `followUpCheck` to the functions array:

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { jobDiscovery }    from '@/inngest/functions/job-discovery';
import { morningBriefing } from '@/inngest/functions/morning-briefing';
import { emailSync }       from '@/inngest/functions/email-sync';
import { followUpCheck }   from '@/inngest/functions/follow-up-check';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [jobDiscovery, morningBriefing, emailSync, followUpCheck],
});
```

- [ ] **Step 4: Commit**

```bash
git add inngest/functions/email-sync.ts inngest/functions/follow-up-check.ts app/api/inngest/route.ts
git commit -m "feat(listen): Inngest email-sync and follow-up-check cron functions"
```

---

## Task 5: Email thread viewer admin UI

**Files:**
- Create: `app/api/admin/emails/route.ts`
- Create: `app/admin/listen/page.tsx`
- Create: `components/admin/listen/EmailThread.tsx`

- [ ] **Step 1: Write emails API**

```typescript
// app/api/admin/emails/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('emails')
    .select('*, applications(id, status, job_listings(company, role))')
    .order('received_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data });
}
```

- [ ] **Step 2: Write EmailThread client component**

```tsx
// components/admin/listen/EmailThread.tsx
'use client';

import { useState } from 'react';

interface Email {
  id: string;
  from_address: string;
  subject: string;
  body_text: string;
  direction: 'inbound' | 'outbound';
  received_at: string;
  is_flagged: boolean;
  applications?: { id: string; status: string; job_listings?: { company: string; role: string } | null } | null;
}

interface Props { readonly emails: Email[] }

export function EmailThread({ emails }: Props) {
  const [selected, setSelected] = useState<Email | null>(null);

  const flagged   = emails.filter(e => e.is_flagged);
  const unflagged = emails.filter(e => !e.is_flagged);

  function EmailRow({ e }: { e: Email }) {
    const company = e.applications?.job_listings?.company;
    return (
      <button
        onClick={() => setSelected(e)}
        className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
          selected?.id === e.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {e.direction === 'inbound' ? e.from_address.split('<')[0].trim() : 'You'}
              {company && <span className="text-zinc-400 font-normal ml-1">· {company}</span>}
            </p>
            <p className="text-xs text-zinc-500 truncate">{e.subject}</p>
          </div>
          <p className="text-xs text-zinc-400 shrink-0">{new Date(e.received_at).toLocaleDateString()}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-[600px] border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
      {/* Left: email list */}
      <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
        {flagged.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
              Flagged ({flagged.length})
            </p>
            {flagged.map(e => <EmailRow key={e.id} e={e} />)}
          </div>
        )}
        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
          All ({unflagged.length})
        </p>
        {unflagged.map(e => <EmailRow key={e.id} e={e} />)}
      </div>

      {/* Right: email detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{selected.subject}</p>
              <p className="text-sm text-zinc-500">
                From: {selected.from_address} · {new Date(selected.received_at).toLocaleString()}
              </p>
              {selected.applications && (
                <p className="text-xs text-zinc-400 mt-1">
                  Linked: {selected.applications.job_listings?.company} — {selected.applications.job_listings?.role}
                  ({selected.applications.status})
                </p>
              )}
            </div>
            <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap border-t border-zinc-100 dark:border-zinc-800 pt-4">
              {selected.body_text || '(No text body)'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Select an email to read.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write listen page**

```tsx
// app/admin/listen/page.tsx
import { supabaseAdmin } from '@/lib/supabase-server';
import { EmailThread }   from '@/components/admin/listen/EmailThread';

export default async function ListenPage() {
  const { data } = await supabaseAdmin
    .from('emails')
    .select('*, applications(id, status, job_listings(company, role))')
    .order('received_at', { ascending: false })
    .limit(100);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Listen</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Job-related emails from elz.work22@gmail.com. Syncs every 30 minutes.
        </p>
      </div>
      <EmailThread emails={(data ?? []) as any} />
    </div>
  );
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/emails/route.ts app/admin/listen/page.tsx components/admin/listen/EmailThread.tsx
git commit -m "feat(listen): email thread viewer admin UI"
```

---

**LISTEN plan complete. Gmail sync, domain matching, status updates, follow-up checks, and thread viewer are all live.**
