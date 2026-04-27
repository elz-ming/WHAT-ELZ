'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'All',       href: '/admin/inbox'           },
  { label: 'WhatsApp',  href: '/admin/inbox/whatsapp'  },
  { label: 'Instagram', href: '/admin/inbox/instagram' },
  { label: 'Telegram',  href: '/admin/inbox/telegram'  },
  { label: 'Email',     href: '/admin/inbox/email'     },
];

export function InboxTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1 border-b border-zinc-200 pb-0">
      {TABS.map(({ label, href }) => {
        const active = href === '/admin/inbox' ? path === '/admin/inbox' : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
