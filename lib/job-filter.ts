// Keywords that disqualify a role title outright (intern / non-engineering)
const HARD_EXCLUDE: readonly RegExp[] = [
  /\bintern(ship)?\b/i,
  /\btrainee\b/i,
  /\bapprentice\b/i,
  /\baccount\s+executive\b/i,
  /\baccount\s+manager\b/i,
  /\bsales\b/i,
  /\bmarketing\b/i,
  /\bfinance\b/i,
  /\btreasury\b/i,
  /\bdesigner\b/i,
  /\blegal\b/i,
  /\brecruiter\b/i,
  /\btalent\b/i,
  /\bcustomer\s+success\b/i,
  /\bcustomer\s+support\b/i,
  /\boperations\s+specialist\b/i,
  /\bfield\s+marketing\b/i,
];

// "analyst" is excluded unless paired with data/research context
const ANALYST_EXCLUDE = /\banalyst\b/i;
const ANALYST_ALLOW   = /\b(data|research|ai|ml|quantitative)\b/i;

// Seniority signals — soft filter (still inserted, marked rejected)
const SOFT_EXCLUDE: readonly RegExp[] = [
  /\bsenior\b/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\bdirector\b/i,
  /\b(vp|vice\s+president)\b/i,
  /\bhead\s+of\b/i,
];

// "Lead" is soft-excluded unless it's "Tech Lead" (sometimes grad-level)
const LEAD_EXCLUDE = /\blead\b/i;
const LEAD_ALLOW   = /\btech\s+lead\b/i;

export type FilterReason = 'intern' | 'non-engineering' | 'seniority' | null;

export function classifyRole(role: string): FilterReason {
  if (HARD_EXCLUDE.some(rx => rx.test(role))) return 'non-engineering';

  if (ANALYST_EXCLUDE.test(role) && !ANALYST_ALLOW.test(role)) return 'non-engineering';

  if (SOFT_EXCLUDE.some(rx => rx.test(role))) return 'seniority';

  if (LEAD_EXCLUDE.test(role) && !LEAD_ALLOW.test(role)) return 'seniority';

  return null;
}

export function shouldReject(role: string): boolean {
  return classifyRole(role) !== null;
}
