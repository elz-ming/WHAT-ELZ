import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-8">
      <Link
        href="/"
        className="font-mono text-xs font-semibold tracking-widest uppercase"
      >
        whatelz.ai
      </Link>
      <ThemeToggle />
    </header>
  );
}
