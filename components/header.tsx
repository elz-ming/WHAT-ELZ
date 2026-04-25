import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { label: "Projects", href: "/#projects" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/#contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-[var(--background)]/80 px-6 py-4 backdrop-blur sm:px-8 dark:border-zinc-800">
      <Link
        href="/"
        className="font-mono text-xs font-semibold tracking-widest uppercase"
      >
        whatelz.ai
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="font-mono text-[11px] tracking-widest text-zinc-600 uppercase transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
      <div className="sm:hidden">
        <ThemeToggle />
      </div>
    </header>
  );
}
