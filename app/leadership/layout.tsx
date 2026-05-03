import type { ReactNode } from 'react';
import { listLeadership } from '@/lib/leadership';
import { NavInjector } from '@/components/shell/NavInjector';
import type { NavItem } from '@/lib/shell/nav-registry';

export default async function LeadershipLayout({ children }: { children: ReactNode }) {
  const entries = await listLeadership(true);

  const navItems: NavItem[] = [
    { type: 'link', href: '/leadership', label: 'Leadership' },
    ...entries.map(e => ({
      type: 'link' as const,
      href: '/leadership',
      label: `${e.role} — ${e.organisation}`,
    })),
  ];

  return (
    <>
      <NavInjector items={navItems} />
      {children}
    </>
  );
}
