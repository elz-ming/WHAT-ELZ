import Link from "next/link";

const footerNav = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Services", href: "/services" },
  { label: "Admin", href: "/admin" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 px-6 py-10 sm:px-8 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
          &copy; {new Date().getFullYear()} whatelz.ai
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
