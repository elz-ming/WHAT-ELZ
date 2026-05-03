import type { ReactNode } from 'react';
import { listMentorship } from '@/lib/mentorship';
import { NavInjector } from '@/components/shell/NavInjector';
import type { NavItem } from '@/lib/shell/nav-registry';

export default async function MentorshipLayout({ children }: { children: ReactNode }) {
  const entries = await listMentorship(true);

  const navItems: NavItem[] = [
    { type: 'link', href: '/mentorship', label: 'Mentorship' },
    ...entries.map(e => ({
      type: 'link' as const,
      href: `/mentorship/${e.slug}`,
      label: `${e.programme} — ${e.organiser}`,
    })),
  ];

  return (
    <>
      <NavInjector items={navItems} />
      {children}
    </>
  );
}
