import Link from "next/link";

export function Hero() {
  return (
    <section
      id="top"
      data-section="Hero"
      className="border-b border-zinc-200 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          What <span style={{ color: "var(--accent-text)" }}>ELZ</span> can AI
          build for you?
        </h1>

        <p className="mt-8 font-mono text-xs tracking-wide text-zinc-600 sm:text-sm">
          Edmund Lin Zhenming
          <span className="mx-2 text-zinc-400">·</span>
          AI Engineer
          <span className="mx-2 text-zinc-400">·</span>
          Graduating Oct 2026
          <span className="mx-2 text-zinc-400">·</span>
          Looking for entry-level roles
        </p>

        <div className="mt-10 max-w-2xl space-y-3 text-base text-zinc-700 sm:text-lg">
          <p>4 years across data science, product, and AI engineering.</p>
          <p>
            Currently shipping AI to 5,000+ Financial Advisors at Prudential.
          </p>
          <p>
            This site runs on the same AI infrastructure I work with every day.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="mailto:elz.work22@gmail.com"
            className="inline-flex items-center gap-2 border border-zinc-900 px-5 py-3 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-[var(--accent)] hover:text-zinc-900"
          >
            Get in touch
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
