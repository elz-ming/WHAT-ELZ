import { hackathons } from "@/content/hackathons";

export function Wins() {
  const tier1 = hackathons.filter((h) => h.tier === 1);
  return (
    <section
      id="wins"
      data-section="Hackathons"
      className="border-b border-zinc-200 px-6 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Wins
          </h2>
          <p className="hidden font-mono text-[10px] tracking-widest text-zinc-400 uppercase sm:block">
            Coding hackathons
          </p>
        </header>

        <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
          {tier1.map((h) => (
            <li
              key={h.event}
              className="grid grid-cols-12 items-baseline gap-4 py-5"
            >
              <span className="col-span-3 font-mono text-[10px] tracking-widest text-zinc-500 uppercase sm:text-xs">
                {h.date}
              </span>
              <span className="col-span-5 text-sm font-medium sm:text-base">
                {h.event}
              </span>
              <span
                className="col-span-4 text-right font-mono text-xs tracking-wide uppercase"
                style={{ color: "var(--accent-text)" }}
              >
                {h.placement}
              </span>
              {h.notes && (
                <span className="col-span-12 text-xs text-zinc-500 sm:col-span-9 sm:col-start-4">
                  {h.notes}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
