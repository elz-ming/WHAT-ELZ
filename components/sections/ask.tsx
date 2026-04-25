"use client";

import { useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { STARTER_PROMPTS, MAX_INPUT_CHARS } from "@/lib/chat-prompt";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

function parseError(err: Error | undefined): {
  code: string;
  message: string;
} {
  if (!err) return { code: "unknown", message: "Something went wrong." };
  // The AI SDK throws Error("..."); the message often contains the JSON body.
  // Try to parse, otherwise show a friendly default.
  const raw = err.message ?? "";
  try {
    const start = raw.indexOf("{");
    if (start >= 0) {
      const parsed = JSON.parse(raw.slice(start)) as ApiErrorPayload;
      return {
        code: parsed.error ?? "unknown",
        message: parsed.message ?? "Something went wrong.",
      };
    }
  } catch {
    /* fall through */
  }
  if (raw.toLowerCase().includes("503")) {
    return {
      code: "ai_offline",
      message:
        "Chat is being wired up — email Edmund at elz.work22@gmail.com in the meantime.",
    };
  }
  return { code: "unknown", message: "Chat is having a moment. Try again." };
}

export function Ask() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });
  const [input, setInput] = useState("");

  const busy = status === "submitted" || status === "streaming";
  const trimmed = input.trim();
  const overLimit = trimmed.length > MAX_INPUT_CHARS;
  const canSend = !busy && trimmed.length > 0 && !overLimit;

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || value.length > MAX_INPUT_CHARS || busy) return;
    sendMessage({ text: value });
    setInput("");
  };

  const errorView = error ? parseError(error) : null;

  return (
    <section
      id="ask"
      className="border-b border-zinc-200 px-6 py-20 sm:px-8 sm:py-24 dark:border-zinc-800"
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-baseline justify-between">
          <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Ask the site
          </h2>
          <p className="hidden font-mono text-[10px] tracking-widest text-zinc-400 uppercase sm:block">
            Live · Groq · streaming
          </p>
        </header>

        <p className="mb-6 max-w-xl text-base text-zinc-700 dark:text-zinc-300">
          Ask anything about Edmund. The model reads this site&rsquo;s context
          live and answers in his third person — same AI infra he ships with.
        </p>

        <div className="border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {/* Transcript */}
          <div
            aria-live="polite"
            className="max-h-[420px] min-h-[120px] space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
          >
            {messages.length === 0 && !errorView && (
              <div className="space-y-4">
                <p className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                  Try
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submit(prompt)}
                      disabled={busy}
                      className="border border-zinc-300 px-3 py-2 text-left text-xs text-zinc-700 transition-colors hover:border-zinc-900 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 sm:text-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .filter(
                  (p): p is { type: "text"; text: string } => p.type === "text",
                )
                .map((p) => p.text)
                .join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                    {isUser ? "You" : "Site"}
                  </span>
                  <div
                    className={
                      isUser
                        ? "text-sm text-zinc-900 sm:text-base dark:text-zinc-100"
                        : "text-sm whitespace-pre-wrap text-zinc-700 sm:text-base dark:text-zinc-300"
                    }
                  >
                    {text || <span className="text-zinc-400">…</span>}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <p className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                thinking…
              </p>
            )}

            {errorView && (
              <p className="border border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {errorView.message}
              </p>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-stretch gap-0 border-t border-zinc-200 dark:border-zinc-800"
          >
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value.slice(0, MAX_INPUT_CHARS))
              }
              maxLength={MAX_INPUT_CHARS}
              placeholder="Ask about projects, the arc, contact…"
              aria-label="Ask about Edmund"
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none focus:ring-inset sm:px-6 sm:py-4 sm:text-base dark:text-zinc-100"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="border-l border-zinc-200 px-4 font-mono text-xs tracking-widest text-zinc-700 uppercase transition-colors hover:bg-zinc-100 sm:px-6 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="border-l border-zinc-200 bg-[var(--accent)] px-4 font-mono text-xs tracking-widest text-zinc-900 uppercase transition-opacity hover:opacity-90 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 dark:border-zinc-800"
              >
                Send
              </button>
            )}
          </form>

          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 sm:px-6 dark:border-zinc-900">
            <p className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
              Stateless · 20/hr cap
            </p>
            <p
              className={`font-mono text-[10px] tracking-widest uppercase ${
                overLimit ? "text-red-600 dark:text-red-400" : "text-zinc-400"
              }`}
            >
              {trimmed.length}/{MAX_INPUT_CHARS}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
