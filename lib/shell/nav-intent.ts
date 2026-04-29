'use client';

import { supabase } from '@/lib/supabase-client';

export type NavStep =
  | { type: 'push'; route: string }
  | { type: 'scroll'; id: string }
  | { type: 'blink-heading'; id: string }
  | { type: 'blink-row'; dataAttr: string; dataValue: string; destRoute: string }
  | { type: 'delay'; ms: number };

// ── Specific hackathon name patterns → Supabase slug lookup ──────────────────

const HACKATHON_PATTERNS: Array<{ re: RegExp; q: string }> = [
  { re: /hackomania/i,              q: 'hackomania'    },
  { re: /pan.?sea/i,                q: 'pan-sea'       },
  { re: /singhacks|sing hacks/i,    q: 'singhacks'     },
  { re: /youth.?finance/i,          q: 'youth finance' },
  { re: /asmi/i,                    q: 'asmi'          },
];

export async function lookupHackathonRoute(text: string): Promise<string | null> {
  const t = text.toLowerCase();

  // "most recent win / latest win / recent hackathon win" → query by date
  if (/most.{0,10}recent|latest.{0,10}win|recent.{0,10}win|newest.{0,10}win/.test(t)) {
    const { data } = await supabase
      .from('hackathons')
      .select('slug, awards')
      .eq('published', true)
      .order('date', { ascending: false })
      .limit(10);
    const winner = (data ?? []).find(h => Array.isArray(h.awards) && h.awards.length > 0);
    if (winner?.slug) return winner.slug;
  }

  for (const { re, q } of HACKATHON_PATTERNS) {
    if (!re.test(text)) continue;
    const { data } = await supabase
      .from('hackathons')
      .select('slug')
      .ilike('name', `%${q}%`)
      .eq('published', true)
      .limit(1)
      .single();
    if (data?.slug) return data.slug;
  }
  return null;
}

// ── Specific career entry lookup ──────────────────────────────────────────────

const CAREER_PATTERNS: Array<{ re: RegExp; q: string }> = [
  { re: /prudential/i,  q: 'prudential'  },
  { re: /setel/i,       q: 'setel'       },
  { re: /asiaverify/i,  q: 'asiaverify'  },
];

export async function lookupCareerRoute(text: string): Promise<string | null> {
  const t = text.toLowerCase();

  // "current internship / current role / current job" → most recent active entry
  if (/current.{0,20}(intern|job|role|position|work)|his.{0,10}current/.test(t)) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('career')
      .select('slug, end_date')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    if (data?.slug) return data.slug;
  }

  // Specific company name
  for (const { re, q } of CAREER_PATTERNS) {
    if (!re.test(text)) continue;
    const { data } = await supabase
      .from('career')
      .select('slug')
      .ilike('company', `%${q}%`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    if (data?.slug) return data.slug;
  }

  return null;
}

// ── General topic detection ───────────────────────────────────────────────────

export function detectTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/hackathon|hackomania|pan.?sea|singhack|coding.{0,20}win|win.{0,20}hack/.test(t)) return 'hackathons';
  if (/internship|career|prudential|setel|asiaverify|work.{0,15}experience|experience.{0,15}work/.test(t)) return 'career';
  if (/\batlas\b|doublelead|double.?lead|\bproject/.test(t)) return 'projects';
  if (/contact|email.{0,15}edmund|reach.{0,15}edmund|get.{0,15}touch/.test(t)) return 'contact';
  if (/youtube|instagram|\bmedium\b|linkedin|channel/.test(t)) return 'channels';
  return null;
}

// ── buildSteps — constructs the nav queue ─────────────────────────────────────

export function buildSteps(
  nav: { target: string; mode: string; slug?: string },
  currentPath: string,
  dest: { scrollId: string; route: string },
): NavStep[] {
  const isHome = currentPath === '/';
  const isListPage = currentPath === dest.route;
  const steps: NavStep[] = [];

  if (nav.mode === 'section') {
    if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
    }
  } else if (nav.mode === 'list') {
    if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
    } else if (isListPage) {
      // already on list page — nothing to do
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
    }
  } else if (nav.mode === 'item' && nav.slug) {
    const detailRoute = `${dest.route}/${nav.slug}`;
    const dataAttr = nav.target === 'hackathons' ? 'data-hackathon-slug' : 'data-career-slug';

    if (isListPage) {
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    } else if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    }
  }

  return steps;
}
