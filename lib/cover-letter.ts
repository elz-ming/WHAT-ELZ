import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// ── Variant selector ──────────────────────────────────────────────────────────

const BLOCKCHAIN_RE = /blockchain|crypto(?!graphy)|web3|defi|nft|smart.?contract|ethereum|solidity|\btoken\b/i;
const AI_RE         = /\bai\b|machine.?learning|\bml\b|\bllm\b|deep.?learning|neural.?network|\bnlp\b|computer.?vision|generative/i;

export function selectResumeVariant(jdText: string): 'AI Engineer' | 'Blockchain Engineer' | 'Software Engineer' {
  if (BLOCKCHAIN_RE.test(jdText)) return 'Blockchain Engineer';
  if (AI_RE.test(jdText))         return 'AI Engineer';
  return 'Software Engineer';
}

// ── Generator ─────────────────────────────────────────────────────────────────

const SYSTEM = `You write cover letters for Edmund Lin Zhenming. Produce exactly four paragraphs, no headers, no subject line.

STRUCTURE:
Para 1 — Hook (2-3 sentences)
  - Who Edmund is in one line
  - One specific reason for applying to THIS company — must reference something real from the JD or the company's known focus, not a generic trait

Para 2 — Most relevant experience (3-4 sentences)
  - One concrete story from the resume (Prudential, Setel, AsiaVerify, or a project) that maps directly to the JD requirements
  - Must include at least one quantified achievement from the resume bullets
  - Draw from provided resume content only — never invent or round up numbers

Para 3 — Fit beyond the JD (2-3 sentences)
  - Something specific about the company's actual problem or domain that Edmund understands
  - Not generic skill-matching — show insight into why Edmund specifically fits

Para 4 — Close (2 sentences)
  - Express interest in a conversation
  - No "I am excited", no "thank you for your consideration", no over-thanking

HARD RULES:
- Under 350 words total (body only, not salutation/sign-off)
- Salutation: "Dear Hiring Manager," unless the JD names the hiring manager
- Sign-off: just the name — Edmund Lin Zhenming
- Never start any sentence with "I am excited"
- No invented or inflated numbers — only use figures present in the resume bullets you are given
- No LinkedIn-post language: "passionate about", "thrilled", "dynamic team", "impactful journey", "collaborative environment"
- Dense, factual, low filler — Edmund's voice matches his resume: direct, no hype
- If a sentence could have been written by any candidate, rewrite it`;

export async function generateCoverLetter(
  jobRole: string,
  companyName: string,
  jdText: string,
  resumeContent: string,
  profileContext: string,
): Promise<string> {
  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system:     SYSTEM,
    messages: [{
      role:    'user',
      content: `Write a cover letter for Edmund applying to: ${jobRole} at ${companyName}

JOB DESCRIPTION (first 2000 chars):
${jdText.slice(0, 2000)}

RESUME CONTENT:
${resumeContent.slice(0, 3000)}

CANDIDATE PROFILE CONTEXT:
${profileContext.slice(0, 1000)}

Produce only the cover letter text — salutation, four paragraphs, sign-off. No commentary.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return text.trim();
}
