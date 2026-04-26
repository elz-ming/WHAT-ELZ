// One-shot migration: reads ~/.elzos/elzos.db, writes to Supabase public schema.
// Safe to re-run: uses upsert with ignoreDuplicates for all inserts.

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';

const SQLITE_PATH = join(homedir(), '.elzos', 'elzos.db');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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

function toTs(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBool(v: number | null | undefined): boolean {
  return v === 1;
}

async function insert(table: string, rows: object[]): Promise<void> {
  if (rows.length === 0) { console.log(`  – ${table}: 0 rows (skipped)`); return; }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

function tableExists(name: string): boolean {
  const row = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(name) as { name: string } | undefined;
  return row !== undefined;
}

async function migrateJobSources(): Promise<void> {
  if (!tableExists('job_sources')) return;
  const rows = sqlite.prepare('SELECT * FROM job_sources').all() as any[];
  const mapped = rows.map(r => {
    const id = randomUUID();
    jobSourceMap.set(r.id, id);
    return {
      id, name: r.name, base_url: r.base_url,
      auth_type: r.auth_type, is_enabled: toBool(r.is_enabled),
      config: r.config ? JSON.parse(r.config) : null,
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    };
  });
  await insert('job_sources', mapped);
}

async function migrateCompanies(): Promise<void> {
  if (!tableExists('companies')) return;
  const rows = sqlite.prepare('SELECT * FROM companies').all() as any[];
  const mapped = rows.map(r => {
    const id = randomUUID();
    companyMap.set(r.id, id);
    return {
      id, name: r.name, industry: r.industry, website: r.website,
      careers_url: r.careers_url, ats_type: r.ats_type, ats_slug: r.ats_slug,
      priority: r.priority, status: r.status, source: 'derived',
      last_checked_at: toTs(r.last_checked_at),
      last_fetch_count: r.last_fetch_count ?? 0, notes: r.notes,
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
      updated_at: toTs(r.updated_at) ?? new Date().toISOString(),
    };
  });
  await insert('companies', mapped);
}

async function migrateResumes(): Promise<void> {
  if (!tableExists('resumes')) return;
  const rows = sqlite.prepare('SELECT * FROM resumes').all() as any[];
  const mapped = rows.map(r => {
    const id = randomUUID();
    resumeMap.set(r.id, id);
    return {
      id, label: r.label, raw_text: r.raw_text,
      structured: r.structured ? JSON.parse(r.structured) : {},
      file_path: r.file_path, is_active: toBool(r.is_active),
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
      updated_at: toTs(r.updated_at) ?? new Date().toISOString(),
    };
  });
  await insert('resumes', mapped);
}

async function migrateEmailAccounts(): Promise<void> {
  if (!tableExists('email_accounts')) return;
  const rows = sqlite.prepare('SELECT * FROM email_accounts').all() as any[];
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
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    };
  });
  await insert('email_accounts', mapped);
}

async function migrateJobListings(): Promise<void> {
  if (!tableExists('job_listings')) return;
  const rows = sqlite.prepare('SELECT * FROM job_listings').all() as any[];
  const mapped = rows.map(r => {
    const id = randomUUID();
    listingMap.set(r.id, id);
    return {
      id,
      source_id:       r.source_id  ? (jobSourceMap.get(r.source_id)  ?? null) : null,
      company_id:      r.company_id ? (companyMap.get(r.company_id)   ?? null) : null,
      external_id: r.external_id, external_url: r.external_url,
      company: r.company, role: r.role, location: r.location,
      remote_type: r.remote_type,
      salary_min: r.salary_min, salary_max: r.salary_max,
      salary_currency: r.salary_currency ?? 'SGD',
      description: r.description,
      requirements: r.requirements ? JSON.parse(r.requirements) : null,
      posted_at: toTs(r.posted_at),
      discovered_at: toTs(r.discovered_at) ?? new Date().toISOString(),
      match_score: r.match_score,
      score_breakdown: r.score_breakdown ? JSON.parse(r.score_breakdown) : null,
      score_reasoning: r.score_reasoning,
      status: r.status ?? 'new', source: 'derived', user_notes: r.user_notes,
    };
  });
  await insert('job_listings', mapped);
}

async function migrateApplications(): Promise<void> {
  if (!tableExists('applications')) return;
  const rows = sqlite.prepare('SELECT * FROM applications').all() as any[];
  const mapped = rows.map(r => {
    const id = randomUUID();
    appMap.set(r.id, id);
    return {
      id,
      listing_id: r.listing_id ? (listingMap.get(r.listing_id) ?? null) : null,
      resume_id:  r.resume_id  ? (resumeMap.get(r.resume_id)   ?? null) : null,
      cover_letter: r.cover_letter,
      resume_bullets:  r.resume_bullets  ? JSON.parse(r.resume_bullets)  : null,
      custom_answers:  r.custom_answers  ? JSON.parse(r.custom_answers)  : null,
      status: r.status ?? 'draft', applied_at: toTs(r.applied_at),
      applied_via: r.applied_via, response_status: r.response_status,
      last_response_at: toTs(r.last_response_at),
      follow_up_at: toTs(r.follow_up_at), follow_up_count: r.follow_up_count ?? 0,
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
      updated_at: toTs(r.updated_at) ?? new Date().toISOString(),
    };
  });
  await insert('applications', mapped);
}

async function migrateApplicationEvents(): Promise<void> {
  if (!tableExists('application_events')) return;
  const rows = sqlite.prepare('SELECT * FROM application_events').all() as any[];
  const mapped = rows
    .map(r => ({
      id: randomUUID(),
      application_id: appMap.get(r.application_id) ?? null,
      event_type: r.event_type, old_value: r.old_value, new_value: r.new_value,
      details: r.details ? JSON.parse(r.details) : null,
      source: r.source ?? 'system',
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    }))
    .filter(r => r.application_id !== null);
  await insert('application_events', mapped);
}

async function migrateEmails(): Promise<void> {
  if (!tableExists('emails')) return;
  const rows = sqlite.prepare('SELECT * FROM emails').all() as any[];
  const mapped = rows.map(r => ({
    id: randomUUID(),
    account_id:     r.account_id     ? (accountMap.get(r.account_id)   ?? null) : null,
    application_id: r.application_id ? (appMap.get(r.application_id)   ?? null) : null,
    message_id: r.message_id, thread_id: r.thread_id,
    in_reply_to: r.in_reply_to, from_address: r.from_address,
    to_address: r.to_address, subject: r.subject,
    body_text: r.body_text, body_html: r.body_html,
    direction: r.direction, is_read: toBool(r.is_read), is_flagged: toBool(r.is_flagged),
    received_at: toTs(r.received_at),
    created_at: toTs(r.created_at) ?? new Date().toISOString(),
  }));
  await insert('emails', mapped);
}

async function migrateSimple(): Promise<void> {
  if (tableExists('user_profile')) {
    const rows = sqlite.prepare('SELECT * FROM user_profile').all() as any[];
    await insert('user_profile', rows.map(r => ({
      id: randomUUID(), category: r.category, key: r.key, value: r.value,
      source: r.source ?? 'manual', confidence: r.confidence ?? 1.0,
      sort_order: r.sort_order ?? 0,
      updated_at: toTs(r.updated_at) ?? new Date().toISOString(),
    })));
  }

  if (tableExists('briefings')) {
    const rows = sqlite.prepare('SELECT * FROM briefings').all() as any[];
    await insert('briefings', rows.map(r => ({
      id: randomUUID(), date: r.date, content: r.content, summary: r.summary,
      items: r.items ? JSON.parse(r.items) : [],
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    })));
  }

  if (tableExists('agent_runs')) {
    const rows = sqlite.prepare('SELECT * FROM agent_runs').all() as any[];
    await insert('agent_runs', rows.map(r => ({
      id: randomUUID(), agent: r.agent, status: r.status,
      started_at: toTs(r.started_at) ?? new Date().toISOString(),
      finished_at: toTs(r.finished_at),
      result: r.result ? JSON.parse(r.result) : null, error: r.error,
      items_found: r.items_found ?? 0, items_acted: r.items_acted ?? 0,
    })));
  }

  if (tableExists('notifications')) {
    const rows = sqlite.prepare('SELECT * FROM notifications').all() as any[];
    await insert('notifications', rows.map(r => ({
      id: randomUUID(), module: r.module, title: r.title, body: r.body,
      priority: r.priority ?? 'normal', is_read: toBool(r.is_read),
      action_type: r.action_type, action_id: null,
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    })));
  }

  if (tableExists('writing_samples')) {
    const rows = sqlite.prepare('SELECT * FROM writing_samples').all() as any[];
    await insert('writing_samples', rows.map(r => ({
      id: randomUUID(), category: r.category, content: r.content,
      was_edited: toBool(r.was_edited), original: r.original,
      created_at: toTs(r.created_at) ?? new Date().toISOString(),
    })));
  }
}

async function main(): Promise<void> {
  console.log(`Reading from: ${SQLITE_PATH}\n`);

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
