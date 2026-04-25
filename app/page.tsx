export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
        WHAT-<span style={{ color: "var(--accent-text)" }}>ELZ</span>
      </h1>
      <p className="mt-6 font-mono text-xs tracking-widest text-zinc-500 uppercase sm:text-sm">
        Edmund Lin Zhenming &middot; AI Engineer
      </p>
      <p className="mt-10 font-mono text-xs tracking-widest text-zinc-400 uppercase">
        Coming soon.
      </p>
    </main>
  );
}
