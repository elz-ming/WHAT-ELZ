'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem  = { href: string; label: string; exact?: boolean; external?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: '/admin', label: 'Dashboard', exact: true }],
  },
  {
    label: 'Profile',
    items: [
      { href: '/admin/hackathons', label: 'Hackathons' },
      { href: '/admin/career',     label: 'Career'     },
    ],
  },
  {
    label: 'Website',
    items: [
      { href: '/admin/website', label: 'Site Map' },
    ],
  },
  {
    label: 'Job Seeking',
    items: [
      { href: '/admin/resume', label: 'Resume' },
      { href: '/admin/apply',  label: 'Apply'  },
      { href: '/admin/hunt',   label: 'Hunt'   },
      { href: '/admin/listen', label: 'Listen' },
    ],
  },
  {
    items: [
      { href: '/admin/blog',      label: 'Blog'      },
      { href: '/admin/developer', label: 'Developer' },
    ],
  },
];

const NAV_BOTTOM: NavItem[] = [
  { href: '/admin/media',               label: 'Media'    },
  { href: 'https://whatelz.vercel.app', label: 'Public ↗', external: true },
];

export function AdminSidebar() {
  const path = usePathname();

  function isActive({ href, exact }: NavItem) {
    if (exact) return path === href;
    return path === href || path.startsWith(href + '/');
  }

  function linkCls(active: boolean) {
    return `block px-3 py-1.5 rounded text-sm transition-colors ${
      active
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-600 hover:text-zinc-900'
    }`;
  }

  return (
    <nav className="w-48 shrink-0 border-r border-zinc-200 h-screen overflow-y-auto flex flex-col">
      <div className="p-4 flex-1 space-y-4">
        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">WHATELZ</p>

        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className={linkCls(isActive(item))}>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-100 space-y-0.5">
        {NAV_BOTTOM.map(item =>
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls(false)}
            >
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={linkCls(isActive(item))}>
              {item.label}
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
