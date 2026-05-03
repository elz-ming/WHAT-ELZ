import type { ReactNode } from 'react';
import { listCareer } from '@/lib/career';
import { NavInjector } from '@/components/shell/NavInjector';
import type { NavItem } from '@/lib/shell/nav-registry';

export default async function CareerLayout({ children }: { children: ReactNode }) {
  const entries = await listCareer(true);

  // Deduplicate by slug (multiple roles at same company share a slug/page)
  const seen = new Set<string>();
  const navItems: NavItem[] = [
    { type: 'link', href: '/career', label: 'Career' },
  ];
  for (const e of entries) {
    if (!seen.has(e.slug)) {
      seen.add(e.slug);
      navItems.push({ type: 'link', href: `/career/${e.slug}`, label: e.company });
    }
  }

  return (
    <>
      <NavInjector items={navItems} />
      {children}
    </>
  );
}
