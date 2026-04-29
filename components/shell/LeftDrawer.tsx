'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDrawerStore } from '@/lib/shell/drawer-store';

type Section = { id: string; label: string };

export function LeftDrawer() {
  const { state, dispatch } = useDrawerStore();
  const pathname = usePathname();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Re-scan for sections whenever the route changes
  useEffect(() => {
    // Small delay to let the page render
    const timer = setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      setSections(
        els
          .filter(el => el.id && el.dataset.section)
          .map(el => ({ id: el.id, label: el.dataset.section! }))
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect();

    if (sections.length === 0) {
      setActiveId('');
      return;
    }

    // Track intersection ratios to find the most visible section
    const ratios = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => ratios.set(e.target.id, e.intersectionRatio));
        // Pick section with highest ratio; on tie prefer topmost (first in DOM)
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
  }, [sections]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-zinc-200 bg-[var(--background)] transition-transform duration-200 ${
        state.left ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Section navigation"
    >
      {/* Top spacer matches header height so content starts below it */}
      <div className="h-14 shrink-0 border-b border-zinc-200" />

      <div className="flex-1 overflow-y-auto p-4">
        {sections.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            No sections
          </p>
        ) : (
          <ul className="space-y-0.5">
            {sections.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left rounded px-3 py-2 text-sm transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                    activeId === s.id
                      ? 'bg-zinc-100 font-semibold text-zinc-900'
                      : 'text-zinc-600'
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
