'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { useNavRegistry } from '@/lib/shell/nav-registry';

type Section = { id: string; label: string };

export function LeftDrawer() {
  const { state, dispatch } = useDrawerStore();
  const { navItems } = useNavRegistry();
  const pathname = usePathname();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const hasRegisteredNav = navItems.length > 0;

  // Close on route change (link nav mode)
  useEffect(() => {
    if (hasRegisteredNav) dispatch({ type: 'CLOSE_LEFT' });
  }, [pathname, hasRegisteredNav, dispatch]);

  // Re-scan DOM for data-section when route changes (scroll-spy mode)
  useEffect(() => {
    if (hasRegisteredNav) return;
    const timer = setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      setSections(
        els
          .filter(el => el.id && el.dataset.section)
          .map(el => ({ id: el.id, label: el.dataset.section! }))
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname, hasRegisteredNav]);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    if (hasRegisteredNav) return;
    observerRef.current?.disconnect();

    if (sections.length === 0) {
      setActiveId('');
      return;
    }

    const ratios = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => ratios.set(e.target.id, e.intersectionRatio));
        let best = '';
        let bestRatio = 0;
        sections.forEach(s => {
          const r = ratios.get(s.id) ?? 0;
          if (r > bestRatio) { bestRatio = r; best = s.id; }
        });
        if (best) setActiveId(best);
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sections, hasRegisteredNav]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-zinc-200 bg-[var(--background)] transition-transform duration-200 ${
        state.left ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Navigation"
    >
      {/* Spacer matching header height */}
      <div className="h-14 shrink-0 border-b border-zinc-200" />

      <div className="flex-1 overflow-y-auto p-4">
        {hasRegisteredNav ? (
          /* Link nav mode (admin) */
          <ul className="space-y-0.5">
            {navItems.map(item => {
              if (item.type !== 'link') return null;
              const active = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                      active ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : sections.length > 0 ? (
          /* Scroll-spy mode (home) */
          <ul className="space-y-0.5">
            {sections.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                    activeId === s.id ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600'
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            No sections
          </p>
        )}
      </div>
    </aside>
  );
}
