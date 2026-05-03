import type { ReactNode } from 'react';
import { listHackathons } from '@/lib/hackathons';
import { NavInjector } from '@/components/shell/NavInjector';
import type { NavItem } from '@/lib/shell/nav-registry';

export default async function HackathonsLayout({ children }: { children: ReactNode }) {
  const hackathons = await listHackathons(true);

  const navItems: NavItem[] = [
    { type: 'link', href: '/hackathons', label: 'Hackathons' },
    ...hackathons.map(h => ({
      type: 'link' as const,
      href: `/hackathons/${h.slug}`,
      label: h.name,
    })),
  ];

  return (
    <>
      <NavInjector items={navItems} />
      {children}
    </>
  );
}
