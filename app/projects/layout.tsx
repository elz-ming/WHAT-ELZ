import type { ReactNode } from 'react';
import { listProjects } from '@/lib/projects';
import { NavInjector } from '@/components/shell/NavInjector';
import type { NavItem } from '@/lib/shell/nav-registry';

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const projects = await listProjects(true);

  const navItems: NavItem[] = [
    { type: 'link', href: '/projects', label: 'Projects' },
    ...projects.map(p => ({
      type: 'link' as const,
      href: `/projects/${p.slug}`,
      label: p.name,
    })),
  ];

  return (
    <>
      <NavInjector items={navItems} />
      {children}
    </>
  );
}
