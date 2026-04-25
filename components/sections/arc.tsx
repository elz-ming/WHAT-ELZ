import { arc } from "@/content/arc";

export function Arc() {
  return (
    <section
      id="arc"
      className="border-b border-zinc-200 px-6 py-20 sm:px-8 sm:py-24 dark:border-zinc-800"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            The Arc
          </h2>
          <p className="hidden font-mono text-[10px] tracking-widest text-zinc-400 uppercase sm:block">
            2023 → 2026
          </p>
        </header>

        <ol className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
          {arc.map((stop, i) => (
            <li key={stop.period} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="font-mono text-[10px] tracking-widest uppercase"
                  style={{ color: "var(--accent-text)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700"
                  aria-hidden="true"
                />
              </div>
              <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                {stop.period}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">
                {stop.company}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {stop.role}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {stop.shipped}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
