// Client-safe chat constants — no server/fs imports.

export const STARTER_PROMPTS: readonly string[] = [
  "What is Edmund's strongest project?",
  "Tell me about the AI work at Prudential",
  "What hackathons has he won?",
  "How do I contact him?",
] as const;

export const MAX_INPUT_CHARS = 500;
