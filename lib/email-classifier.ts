export type EmailClass =
  | 'interview_invite'
  | 'rejection'
  | 'confirmation'
  | 'recruiter_outreach'
  | 'unknown';

const RULES: Array<{ pattern: RegExp; class: EmailClass }> = [
  { pattern: /interview|schedule.*call|let.*s.*chat|meet.*discuss/i,                                         class: 'interview_invite'    },
  { pattern: /unfortunately|not.*moving forward|other candidates|regret.*inform|not.*selected/i,             class: 'rejection'           },
  { pattern: /application.*received|thank.*applying|successfully.*submitted|received.*application/i,         class: 'confirmation'        },
  { pattern: /opportunity|open.*position|hiring|recruiter|we.*found.*your.*profile/i,                       class: 'recruiter_outreach'  },
];

export function classifyEmail(subject: string, bodyText: string): EmailClass {
  const text = `${subject} ${bodyText.slice(0, 500)}`;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.class;
  }
  return 'unknown';
}
