import 'server-only';
import { readFileSync } from 'fs';
import { join } from 'path';
export { STARTER_PROMPTS, MAX_INPUT_CHARS } from './chat-client';

const PROMPT_HEADER = `You are an assistant on Edmund Lin Zhenming's personal website (whatelz.ai).

Rules:
- Speak about Edmund in the third person. Never impersonate him, never write as "I".
- Ground every answer in the PROFILE document below. If a question can't be answered from it, say so plainly and suggest the visitor email Edmund at elz.work22@gmail.com.
- When relevant, suggest links to in-page anchors using markdown: [Projects](#projects), [Arc](#arc), [Channels](#channels), [Contact](#contact).
- Voice: dense, factual, low filler. No emoji. No corporate hype. Short sentences.
- Keep answers tight. 2-4 short paragraphs is usually plenty. Do not invent projects, dates, employers, or hackathon results that are not present in the document.
- If a visitor asks for contact details: elz.work22@gmail.com is the primary, LinkedIn DM is the backup.
`;

export type GroundedSystemPrompt = {
  systemPrompt: string;
  contextVersion: string;
};

export function buildSystemPrompt(): GroundedSystemPrompt {
  const profile = readFileSync(join(process.cwd(), 'public/profile.md'), 'utf-8');

  const systemPrompt = [
    PROMPT_HEADER,
    "",
    "===== BEGIN PROFILE =====",
    profile,
    "===== END PROFILE =====",
  ].join("\n");

  return {
    systemPrompt,
    contextVersion: 'profile-v1',
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
