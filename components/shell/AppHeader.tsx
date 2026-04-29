'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { ModuleSelector } from './ModuleSelector';
import { pillForPath, PILLS } from '@/lib/pill-access';

interface Props {
  isAdmin: boolean;
}

export function AppHeader({ isAdmin }: Props) {
  const { state, dispatch } = useDrawerStore();
  const pathname = usePathname();
  const active = pillForPath(pathname);
  const activePill = PILLS.find(p => p.key === active);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const leftOffset = state.left ? 256 : 0;
  const rightOffset = state.right ? 360 : 0;

  return (
    <header
      className="fixed top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-[var(--background)] px-4"
      style={{ left: leftOffset, right: rightOffset, transition: 'left 200ms, right 200ms' }}
    >
      {/* Left: hamburger */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_LEFT' })}
        aria-label="Toggle menu"
        className="flex h-9 w-9 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Center: active module + chevron */}
      <div className="relative">
        <button
          onClick={() => setSelectorOpen(v => !v)}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-700 transition-colors hover:bg-zinc-100"
          aria-haspopup="menu"
          aria-expanded={selectorOpen}
        >
          <Link
            href="/"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-900"
          >
            whatelz.ai
          </Link>
          <span className="text-zinc-300 select-none">·</span>
          <span>{activePill?.label ?? 'Home'}</span>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden
            className={`transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {selectorOpen && (
          <ModuleSelector isAdmin={isAdmin} onClose={() => setSelectorOpen(false)} />
        )}
      </div>

      {/* Right: chat icon */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_RIGHT' })}
        aria-label="Toggle chat"
        className="flex h-9 w-9 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M15 2H3a1 1 0 00-1 1v9a1 1 0 001 1h2v3l4-3h6a1 1 0 001-1V3a1 1 0 00-1-1z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
}
