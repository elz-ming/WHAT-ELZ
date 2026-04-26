# PRESENCE Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining PRESENCE module work — activate the Clerk-gated admin and the Groq AI chat widget (both shipped but awaiting env vars), then add an interactive contact/hire-interest form to replace the static mailto link.

**Architecture:** Clerk and Groq are already wired in code (sprints 005 and 007). Activation is purely env var configuration. The contact form is a new server action + client component that POSTs to a new API route and emails Edmund via Resend (or falls back to logging if no key).

**Tech Stack:** Next.js 16 App Router, Clerk, Groq (via AI SDK), Resend (email), Tailwind CSS v4

**Prerequisite:** None — this plan is fully independent of INFRA/APPLY/HUNT/LISTEN.

---

## File Map

**Created:**
- `app/api/contact/route.ts` — POST: validates form, sends email via Resend
- `components/sections/contact-form.tsx` — interactive contact form (client component)

**Modified:**
- `components/sections/contact.tsx` — replace mailto CTA with the new form
- `app/page.tsx` — replace `<Contact />` with new form component if needed

---

## Task 1: Activate Clerk admin

**Files:** none (env var configuration only)

- [ ] **Step 1: Create a Clerk application**

Go to `dashboard.clerk.com` → Create application.
- Name: `whatelz`
- Enable: Google (only)
- Disable: email/password, SMS

- [ ] **Step 2: Add allowlist**

In Clerk dashboard → Restrictions → Allowlist:
- Add `elz.work22@gmail.com`
- Enable "Allowlist only" mode

- [ ] **Step 3: Copy API keys**

Clerk dashboard → API Keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_...`
- `CLERK_SECRET_KEY` = `sk_test_...`

- [ ] **Step 4: Add to Vercel UAT env**

```bash
echo "pk_test_..." | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview --yes
echo "sk_test_..." | vercel env add CLERK_SECRET_KEY preview --yes
```

Also add to `.env.local` for local dev:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

- [ ] **Step 5: Verify admin page loads**

```bash
npm run dev -- -p 3100
```

Navigate to `http://localhost:3100/admin`. Expected: Clerk sign-in page appears.
Sign in with `elz.work22@gmail.com`. Expected: admin dashboard loads.

- [ ] **Step 6: Commit env documentation**

```bash
# Do NOT commit actual keys. Only document what's needed.
git add .env.local.example 2>/dev/null || true
git commit -m "chore(presence): document Clerk env vars required for /admin" --allow-empty
```

---

## Task 2: Activate Groq AI chat widget

**Files:** none (env var configuration only)

- [ ] **Step 1: Get Groq API key**

Go to `console.groq.com` → API Keys → Create new key.
Copy the key.

- [ ] **Step 2: Add to Vercel UAT env**

```bash
echo "<groq-key>" | vercel env add GROQ_API_KEY preview --yes
```

Also add to `.env.local`:
```
GROQ_API_KEY=gsk_...
```

- [ ] **Step 3: Verify chat widget activates**

```bash
npm run dev -- -p 3100
```

Navigate to `http://localhost:3100`. Scroll to the chat widget.
Send a test message: "What did Edmund do at Prudential?"
Expected: streaming AI response grounded in Edmund's background (not a 503 fallback).

- [ ] **Step 4: Verify rate limiting**

```bash
for i in {1..5}; do
  curl -s -X POST http://localhost:3100/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}' | head -c 50
  echo
done
```

Expected: first responses stream normally; after 20 requests/hour the 429 message appears (won't trigger in 5 requests, but confirms the endpoint is live).

---

## Task 3: Interactive contact / hire-interest form

**Files:**
- Create: `app/api/contact/route.ts`
- Create: `components/sections/contact-form.tsx`
- Modify: `components/sections/contact.tsx`

- [ ] **Step 1: Install Resend if not present**

```bash
npm list resend || npm install resend
```

- [ ] **Step 2: Write the contact API route**

```typescript
// app/api/contact/route.ts
import { NextResponse } from 'next/server';

interface ContactPayload {
  name: string;
  email: string;
  intent: 'hire' | 'collab' | 'service' | 'other';
  message: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = 'elz.work22@gmail.com';

export async function POST(req: Request) {
  const body = await req.json() as Partial<ContactPayload>;
  const { name, email, intent, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim() || !intent) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 });
  }

  const intentLabel: Record<ContactPayload['intent'], string> = {
    hire:    'Hiring / Recruiting',
    collab:  'Co-founder / Collaboration',
    service: 'Service Enquiry',
    other:   'Other',
  };

  const text = `New contact from whatelz.ai\n\nName: ${name}\nEmail: ${email}\nIntent: ${intentLabel[intent]}\n\nMessage:\n${message}`;

  if (RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'contact@whatelz.ai',
      to:   TO_EMAIL,
      replyTo: email,
      subject: `[whatelz.ai] ${intentLabel[intent]} from ${name}`,
      text,
    });
    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'send_failed' }, { status: 500 });
    }
  } else {
    // Fallback: log to server console when RESEND_API_KEY not set
    console.log('[contact form]', text);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Write the contact form component**

```tsx
// components/sections/contact-form.tsx
'use client';

import { useState } from 'react';

type Intent = 'hire' | 'collab' | 'service' | 'other';

const INTENTS: { value: Intent; label: string }[] = [
  { value: 'hire',    label: "I'm hiring / recruiting"     },
  { value: 'collab',  label: "I want to co-found / collab" },
  { value: 'service', label: "I need something built"      },
  { value: 'other',   label: 'Something else'              },
];

export function ContactForm() {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [intent,  setIntent]  = useState<Intent>('hire');
  const [message, setMessage] = useState('');
  const [state,   setState]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, intent, message }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded p-8 text-center space-y-2">
        <p className="text-zinc-900 dark:text-zinc-100 font-medium">Message received.</p>
        <p className="text-sm text-zinc-500">I'll reply within a day or two.</p>
      </div>
    );
  }

  const inputCls = "w-full border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <input
          required value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" className={inputCls}
        />
        <input
          required type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Your email" className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {INTENTS.map(i => (
          <button
            key={i.value} type="button"
            onClick={() => setIntent(i.value)}
            className={`text-sm px-3 py-2 rounded border transition-colors text-left ${
              intent === i.value
                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <textarea
        required value={message} onChange={e => setMessage(e.target.value)}
        placeholder="What's on your mind?" rows={4} maxLength={2000}
        className={`${inputCls} resize-none`}
      />

      {state === 'error' && (
        <p className="text-sm text-red-500">Something went wrong. Try emailing elz.work22@gmail.com directly.</p>
      )}

      <button
        type="submit" disabled={state === 'sending'}
        className="w-full py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Read and update the contact section**

Read `components/sections/contact.tsx`. Replace the static `mailto:` CTA with `<ContactForm />`:

```tsx
// Add to imports at top of contact.tsx:
import { ContactForm } from '@/components/sections/contact-form';

// Replace the mailto <a> button with:
<ContactForm />
```

Keep the LinkedIn DM link below the form as a secondary CTA.

- [ ] **Step 5: Build and verify**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/contact/route.ts components/sections/contact-form.tsx components/sections/contact.tsx
git commit -m "feat(presence): interactive contact form with Resend email integration"
```

---

**PRESENCE plan complete. Admin, chat widget, and contact form are all live.**
