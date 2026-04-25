/**
 * System prompt builder for the homepage AI chat widget.
 *
 * v1 strategy: load CONTEXT + MYSTORY from supabase at request time
 * and stuff the full markdown into the system prompt. CONTEXT + MYSTORY
 * are ~20kb combined, well under any modern model context window.
 */

import { readDoc } from "./website-docs";

const PROMPT_HEADER = `You are an assistant on Edmund Lin Zhenming's personal website (whatelz.ai).

Rules:
- Speak about Edmund in the third person. Never impersonate him, never write as "I".
- Ground every answer in the CONTEXT and MYSTORY documents below. If a question can't be answered from those, say so plainly and suggest the visitor email Edmund at elz.work22@gmail.com.
- When relevant, suggest links to in-page anchors using markdown: [Projects](#projects), [Arc](#arc), [Channels](#channels), [Contact](#contact).
- Voice: dense, factual, low filler. Match the "Voice & Tone" guidance inside CONTEXT exactly. No emoji. No corporate hype. Short sentences.
- Keep answers tight. 2-4 short paragraphs is usually plenty. Do not invent projects, dates, employers, or hackathon results that are not present in the documents.
- If a visitor asks for contact details: elz.work22@gmail.com is the primary, LinkedIn DM is the backup.
`;

export type GroundedSystemPrompt = {
  systemPrompt: string;
  contextVersion: string;
};

export async function buildSystemPrompt(): Promise<GroundedSystemPrompt> {
  const [context, mystory] = await Promise.all([
    readDoc("CONTEXT"),
    readDoc("MYSTORY"),
  ]);

  const systemPrompt = [
    PROMPT_HEADER,
    "",
    "===== BEGIN CONTEXT =====",
    context.content,
    "===== END CONTEXT =====",
    "",
    "===== BEGIN MYSTORY =====",
    mystory.content,
    "===== END MYSTORY =====",
  ].join("\n");

  return {
    systemPrompt,
    contextVersion: `${context.generated_at}|${mystory.generated_at}`,
  };
}

/**
 * Suggested first-load prompts. Grounded in actual CONTEXT/MYSTORY topics:
 * Atlas (Prudential AI engineering work), the arc (career narrative),
 * hackathon wins, contact details.
 */
export const STARTER_PROMPTS: readonly string[] = [
  "What is Edmund's strongest project?",
  "Tell me about the AI work at Prudential",
  "What hackathons has he won?",
  "How do I contact him?",
] as const;

/**
 * Light denylist for obvious abuse / jailbreak attempts. Not a real
 * moderation layer — this is v1 best-effort. Anything that matches
 * gets a generic "try a different question" reply without ever
 * hitting the model.
 */
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

export const MAX_INPUT_CHARS = 500;
