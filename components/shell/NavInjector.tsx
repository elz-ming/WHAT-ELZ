'use client';

import { useRegisterNav } from '@/lib/shell/nav-registry';
import type { NavItem } from '@/lib/shell/nav-registry';

export function NavInjector({ items }: { items: NavItem[] }) {
  useRegisterNav(items);
  return null;
}
