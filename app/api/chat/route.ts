import { convertToModelMessages, streamText, zodSchema, type UIMessage, type Tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import {
  buildSystemPrompt,
  isAbusiveInput,
  MAX_INPUT_CHARS,
} from "@/lib/chat-prompt";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";
import { arc } from "@/content/arc";
import { projects, elzOs } from "@/content/projects";

export const maxDuration = 30;

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

type ApiError = {
  error: string;
  message: string;
};

function jsonError(body: ApiError, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chatTools: Record<string, Tool<any, any>> = {
  get_hackathons: {
    description: "Get all published hackathon entries Edmund has competed in.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const { data } = await supabaseAdmin
        .from("hackathons")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: false });
      return data ?? [];
    },
  },
  get_experience: {
    description: "Get Edmund's career experience / work history.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => arc,
  },
  get_projects: {
    description: "Get Edmund's active projects.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => (elzOs ? [...projects, elzOs] : projects),
  },
  navigate_to: {
    description:
      "Navigate the visitor to a section or page. Use when the user asks to see or go to a specific section. target must be one of: hackathons, career, projects, contact, channels.",
    inputSchema: zodSchema(z.object({
      target: z
        .enum(["hackathons", "career", "projects", "contact", "channels"])
        .describe("The destination section or page"),
    })),
    execute: async ({ target }: { target: string }) => ({ action: "navigate", target }),
  },
};

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonError(
      {
        error: "ai_offline",
        message: "Chat is not configured yet",
      },
      503,
    );
  }

  // --- Parse + validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(
      { error: "invalid_json", message: "Body must be JSON" },
      400,
    );
  }

  const messages = (body as { messages?: UIMessage[] })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(
      { error: "invalid_messages", message: "messages array required" },
      400,
    );
  }

  const userText = lastUserText(messages);
  if (!userText) {
    return jsonError(
      { error: "empty_message", message: "User message is empty" },
      400,
    );
  }
  if (userText.length > MAX_INPUT_CHARS) {
    return jsonError(
      {
        error: "message_too_long",
        message: `Keep it under ${MAX_INPUT_CHARS} characters.`,
      },
      400,
    );
  }
  if (isAbusiveInput(userText)) {
    return jsonError(
      {
        error: "rejected",
        message: "Try a different question.",
      },
      400,
    );
  }

  // --- Rate limit ---
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    const minutes = Math.max(
      1,
      Math.ceil((limit.resetMs - Date.now()) / 60000),
    );
    return jsonError(
      {
        error: "rate_limited",
        message: `You've hit the chat cap. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      429,
    );
  }

  // --- Build grounded system prompt + stream ---
  try {
    const { systemPrompt } = buildSystemPrompt();
    const groq = createGroq({ apiKey });
    const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

    const result = streamText({
      model: groq(model),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: 0.4,
      maxOutputTokens: 800,
      tools: chatTools,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    // Don't leak the underlying error string to the client.
    console.error("[chat] upstream failure:", msg);
    return jsonError(
      {
        error: "upstream_error",
        message: "Chat is having a moment. Try again shortly.",
      },
      502,
    );
  }
}
