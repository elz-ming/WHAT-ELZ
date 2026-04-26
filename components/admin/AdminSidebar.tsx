'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',           label: 'Dashboard' },
  { href: '/admin/apply',     label: 'Apply'     },
  { href: '/admin/hunt',      label: 'Hunt'      },
  { href: '/admin/listen',    label: 'Listen'    },
  { href: '/admin/presence',  label: 'Presence'  },
  { href: '/admin/developer', label: 'Developer' },
] as const;

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav className="w-48 shrink-0 border-r border-zinc-200 min-h-screen p-4">
      <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-4">WHATELZ</p>
      <ul className="space-y-1">
        {NAV.map(({ href, label }) => {
          const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
