'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { useNavRegistry } from '@/lib/shell/nav-registry';

type Section = { id: string; label: string; href?: string };

// Pages with dedicated routes — shown as the global nav on all non-home pages
const SITE_NAV = [
  { href: '/',            label: 'Home'       },
  { href: '/career',      label: 'Career'     },
  { href: '/projects',    label: 'Projects'   },
  { href: '/hackathons',  label: 'Hackathons' },
  { href: '/channels',    label: 'Channels'   },
  { href: '/contact',     label: 'Contact'    },
];

export function LeftDrawer() {
  const { state, dispatch } = useDrawerStore();
  const { navItems } = useNavRegistry();
  const pathname = usePathname();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isHome = pathname === '/';
  const hasAdminNav = navItems.length > 0;

  // Determine which mode we're in
  const mode: 'admin' | 'home' | 'site' = hasAdminNav ? 'admin' : isHome ? 'home' : 'site';

  // Close drawer on route change for link-nav modes
  useEffect(() => {
    if (mode !== 'home') dispatch({ type: 'CLOSE_LEFT' });
  }, [pathname, mode, dispatch]);

  // Re-scan DOM for data-section (home scroll-spy only)
  useEffect(() => {
    if (mode !== 'home') return;
    const timer = setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      setSections(
        els
          .filter(el => el.id && el.dataset.section)
          .map(el => ({ id: el.id, label: el.dataset.section!, href: el.dataset.sectionHref }))
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname, mode]);

  // IntersectionObserver scroll-spy (home only)
  useEffect(() => {
    if (mode !== 'home') return;
    observerRef.current?.disconnect();
    if (sections.length === 0) { setActiveId(''); return; }

    const ratios = new Map<string, number>();
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => ratios.set(e.target.id, e.intersectionRatio));
        let best = ''; let bestRatio = 0;
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
  }, [sections, mode]);

  function handleSectionClick(s: Section) {
    if (activeId === s.id && s.href) {
      router.push(s.href);
      dispatch({ type: 'CLOSE_LEFT' });
    } else {
      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-zinc-200 bg-[var(--background)] transition-transform duration-200 ${
        state.left ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Navigation"
    >
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'admin' && (
          <ul className="space-y-0.5">
            {navItems.map(item => {
              if (item.type !== 'link') return null;
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href}
                    className={`block rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                      active ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {mode === 'home' && (
          sections.length > 0 ? (
            <ul className="space-y-0.5">
              {sections.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => handleSectionClick(s)}
                    title={activeId === s.id && s.href ? `Go to ${s.label} page →` : undefined}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                      activeId === s.id ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600'
                    }`}
                  >
                    {s.label}
                    {activeId === s.id && s.href && (
                      <span className="ml-1.5 font-mono text-[10px] text-zinc-400">→</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">No sections</p>
          )
        )}

        {mode === 'site' && (
          <ul className="space-y-0.5">
            {SITE_NAV.map(item => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href}
                    className={`block rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                      active ? 'bg-zinc-100 font-semibold text-zinc-900' : 'text-zinc-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
