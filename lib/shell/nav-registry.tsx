'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type NavItem =
  | { type: 'link'; href: string; label: string }
  | { type: 'section'; id: string; label: string }
  | { type: 'group'; label: string; children: Array<{ href: string; label: string }> };

type NavCtx = {
  navItems: NavItem[];
  setNavItems: (items: NavItem[]) => void;
  clearNavItems: () => void;
};

const Ctx = createContext<NavCtx | null>(null);

export function NavRegistryProvider({ children }: { children: ReactNode }) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  return (
    <Ctx.Provider value={{ navItems, setNavItems, clearNavItems: () => setNavItems([]) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNavRegistry(): NavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNavRegistry must be inside NavRegistryProvider');
  return ctx;
}

/** Drop-in hook for client components: registers nav items on mount, clears on unmount. */
export function useRegisterNav(items: NavItem[]) {
  const { setNavItems, clearNavItems } = useNavRegistry();
  useEffect(() => {
    setNavItems(items);
    return () => clearNavItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
