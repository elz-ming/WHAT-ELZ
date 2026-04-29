import { channels } from "@/content/channels";

export function Channels() {
  return (
    <section
      id="channels"
      data-section="Channels"
      className="border-b border-zinc-200 px-6 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Channels
          </h2>
          <p className="hidden font-mono text-[10px] tracking-widest text-zinc-400 uppercase sm:block">
            Same person, four surfaces
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-px overflow-hidden border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c) => (
            <li key={c.name} className="bg-[var(--background)]">
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-6 transition-colors hover:bg-zinc-50"
                aria-label={`${c.name} — ${c.handle}`}
              >
                <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                  {c.name}
                </p>
                <p className="mt-3 text-base font-medium">{c.handle}</p>
                <p className="mt-2 text-xs text-zinc-500 transition-colors group-hover:text-zinc-700">
                  {c.purpose}
                </p>
                <span
                  aria-hidden="true"
                  className="mt-4 inline-block font-mono text-xs text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-[-2px]"
                >
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
