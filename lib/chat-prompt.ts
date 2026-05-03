import 'server-only';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from './supabase-server';
export { STARTER_PROMPTS, MAX_INPUT_CHARS } from './chat-client';

const PROMPT_HEADER = `You are an assistant on Edmund Lin Zhenming's personal website (whatelz.ai).

Rules:
- Speak about Edmund in the third person. Never impersonate him, never write as "I".
- Ground every answer in the PROFILE and LIVE DATA sections below. If a question can't be answered from them, say so plainly and suggest the visitor email Edmund at elz.work22@gmail.com.
- Navigation is handled automatically by the site — do not attempt to navigate, redirect, or link. Just answer the question.
- Voice: dense, factual, low filler. No emoji. No corporate hype. Short sentences.
- Keep answers tight. 2-4 short paragraphs is usually plenty. Do not invent projects, dates, employers, hackathon results, leadership roles, or mentorship programmes that are not present in the data.
- If a visitor asks for contact details: elz.work22@gmail.com is the primary, LinkedIn DM is the backup.
`;

export type GroundedSystemPrompt = {
  systemPrompt: string;
  contextVersion: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
}
function period(start: string, end: string | null) {
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

export async function buildSystemPrompt(): Promise<GroundedSystemPrompt> {
  // Static bio narrative
  const bio = readFileSync(join(process.cwd(), 'public/profile.md'), 'utf-8');

  // Fetch all live data in parallel
  const [career, projects, hackathons, leadership, mentorship] = await Promise.all([
    supabaseAdmin.from('career').select('*').eq('published', true).order('start_date', { ascending: false }),
    supabaseAdmin.from('projects').select('*').eq('published', true).order('sort_order', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('hackathons').select('*').eq('published', true).order('date', { ascending: false }),
    supabaseAdmin.from('leadership').select('*').eq('published', true).order('start_date', { ascending: false }),
    supabaseAdmin.from('mentorship').select('*').eq('published', true).order('start_date', { ascending: false }),
  ]);

  const sections: string[] = [];

  // Career
  if (career.data?.length) {
    sections.push('## Career Entries (live)');
    for (const e of career.data) {
      sections.push(`### ${e.company} — ${e.role} (${period(e.start_date, e.end_date)})`);
      if (e.description) sections.push(e.description);
      if (e.content) sections.push(e.content);
    }
  }

  // Projects
  if (projects.data?.length) {
    sections.push('## Projects (live)');
    for (const p of projects.data) {
      sections.push(`### ${p.name}${p.tagline ? ` — ${p.tagline}` : ''}`);
      if (p.description) sections.push(p.description);
      if (p.tech_stack?.length) sections.push(`Stack: ${p.tech_stack.join(', ')}`);
      if (p.content) sections.push(p.content);
    }
  }

  // Hackathons
  if (hackathons.data?.length) {
    sections.push('## Hackathons (live)');
    for (const h of hackathons.data) {
      const awards = (h.awards as { title: string; track?: string }[]) ?? [];
      const awardStr = awards.map(a => a.track ? `${a.title} (${a.track})` : a.title).join(', ');
      sections.push(`### ${h.name} (${fmt(h.date)})${awardStr ? ` — ${awardStr}` : ''}`);
      if (h.project_name) sections.push(`Project: ${h.project_name}`);
      if (h.writeup?.trim()) sections.push(h.writeup);
      if (h.content) sections.push(h.content);
    }
  }

  // Leadership
  if (leadership.data?.length) {
    sections.push('## Leadership (live)');
    for (const l of leadership.data) {
      sections.push(`### ${l.role} — ${l.organisation}${l.body ? ` (${l.body})` : ''} (${period(l.start_date, l.end_date)})`);
      if (l.description) sections.push(l.description);
      if (l.content) sections.push(l.content);
    }
  }

  // Mentorship
  if (mentorship.data?.length) {
    sections.push('## Mentorship (live)');
    for (const m of mentorship.data) {
      sections.push(`### ${m.programme} — ${m.organiser} (${period(m.start_date, m.end_date)})`);
      if (m.description) sections.push(m.description);
      if (m.content) sections.push(m.content);
    }
  }

  const liveData = sections.length > 0 ? sections.join('\n\n') : '(No live data available yet.)';

  const systemPrompt = [
    PROMPT_HEADER,
    '',
    '===== BEGIN PROFILE =====',
    bio,
    '===== END PROFILE =====',
    '',
    '===== BEGIN LIVE DATA =====',
    liveData,
    '===== END LIVE DATA =====',
  ].join('\n');

  return {
    systemPrompt,
    contextVersion: 'supabase-live-v1',
  };
}

const DENYLIST: readonly RegExp[] = [
  /\bignore (all |the |previous )?(prior |above )?(instructions|rules|prompt)/i,
  /\bsystem prompt\b/i,
  /\bjailbreak\b/i,
  /\b(act|pretend) (as|to be) (edmund|the user|admin|root)/i,
  /\bDAN\b.*\bmode\b/i,
];

export function isAbusiveInput(input: string): boolean {
  return DENYLIST.some((rx) => rx.test(input));
}
