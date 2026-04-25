import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--accent-text)" }}
      >
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-sm text-zinc-500">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 font-mono text-xs tracking-widest uppercase underline underline-offset-4 hover:opacity-70"
      >
        Return home
      </Link>
    </main>
  );
}
