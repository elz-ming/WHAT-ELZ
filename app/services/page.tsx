import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services — Edmund Lin Zhenming",
  description:
    "AI engineering and web development services by Edmund Lin. Build AI systems, chatbots, dashboards, and modern websites.",
};

export default function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="border-b border-zinc-200 px-6 py-24 sm:px-8 sm:py-32 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Freelance services · By inquiry
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            AI Engineering &amp;{" "}
            <span style={{ color: "var(--accent-text)" }}>
              Web Development
            </span>
          </h1>

          <div className="mt-8 max-w-2xl space-y-3 text-base text-zinc-700 sm:text-lg dark:text-zinc-300">
            <p>
              I take on a small number of client projects alongside my
              internship and studies. Work I&apos;m good at: AI systems that
              actually work, and websites that don&apos;t look like templates.
            </p>
          </div>
        </div>
      </section>

      {/* What I build */}
      <section className="border-b border-zinc-200 px-6 py-24 sm:px-8 sm:py-32 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            What I build
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Two things I do well
          </h2>

          <div className="mt-12 grid gap-12 sm:grid-cols-2">
            {/* Service 1 — AI Systems */}
            <div>
              <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                01
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                AI Systems
              </h3>
              <ul className="mt-5 space-y-2 text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  RAG chatbots grounded in your data
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  AI-powered dashboards and internal tools
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  Model integration (OpenAI, Anthropic, Groq, local models)
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  MCP servers for Claude / AI agent workflows
                </li>
              </ul>
              <p className="mt-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                I&apos;ve shipped two AI systems to 5,000+ Financial Advisors at
                Prudential. I know what production AI looks like.
              </p>
            </div>

            {/* Service 2 — Websites & Web Apps */}
            <div>
              <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                02
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                Websites &amp; Web Apps
              </h3>
              <ul className="mt-5 space-y-2 text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  Next.js sites (like this one) — fast, SEO-ready, deployable to
                  Vercel in hours
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  Full-stack apps with Supabase or your existing backend
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 shrink-0 text-xs"
                    style={{ color: "var(--accent-text)" }}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  Integrations (auth, payments, email, analytics)
                </li>
              </ul>
              <p className="mt-6 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                This site was built in a single day using the same stack
                I&apos;d use for your project.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to engage */}
      <section className="border-b border-zinc-200 px-6 py-24 sm:px-8 sm:py-32 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            How to engage
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple process
          </h2>

          <ol className="mt-12 space-y-8">
            <li className="flex gap-6">
              <span
                className="font-mono text-2xl font-semibold leading-none"
                style={{ color: "var(--accent-text)" }}
              >
                1
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Email with a one-paragraph brief
                </p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                  What you&apos;re building, rough timeline, budget range.
                  That&apos;s all I need to start.
                </p>
              </div>
            </li>

            <li className="flex gap-6">
              <span
                className="font-mono text-2xl font-semibold leading-none"
                style={{ color: "var(--accent-text)" }}
              >
                2
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  20-min call to check fit
                </p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                  No sales pitch. Just a quick conversation to see if this
                  makes sense for both of us.
                </p>
              </div>
            </li>

            <li className="flex gap-6">
              <span
                className="font-mono text-2xl font-semibold leading-none"
                style={{ color: "var(--accent-text)" }}
              >
                3
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Proposal and timeline
                </p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                  Scope, deliverables, and a realistic schedule — in writing.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-12 flex flex-wrap gap-4">
            <a
              href="mailto:elz.work22@gmail.com"
              className="inline-flex items-center gap-2 border border-zinc-900 px-5 py-3 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-[var(--accent)] hover:text-zinc-900 dark:border-zinc-100 dark:hover:text-zinc-900"
            >
              Start with an email <span aria-hidden="true">→</span>
            </a>

            <a
              href="https://www.linkedin.com/in/edmund-lin-zhenming/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-zinc-300 px-5 py-3 font-mono text-xs tracking-widest uppercase text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              Or message on LinkedIn <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* Honest note */}
      <section className="px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            A note on selectivity
          </p>

          <p className="mt-6 max-w-2xl text-base text-zinc-700 sm:text-lg dark:text-zinc-300">
            I&apos;m selective — I take projects where I can do my best work,
            not maximum volume. If it&apos;s not a fit, I&apos;ll say so early.
          </p>
        </div>
      </section>
    </main>
  );
}
