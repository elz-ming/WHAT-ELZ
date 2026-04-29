'use client';

import Link from 'next/link';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { useIsDesktop } from '@/lib/shell/use-is-desktop';

interface Props {
  isAdmin: boolean;
}

export function AppHeader({ isAdmin: _isAdmin }: Props) {
  const { state, dispatch } = useDrawerStore();
  const isDesktop = useIsDesktop();

  const leftOffset  = isDesktop && state.left  ? 256 : 0;
  const rightOffset = isDesktop && state.right ? 360 : 0;

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

      {/* Center: wordmark */}
      <Link
        href="/"
        className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-900 hover:opacity-70 transition-opacity"
      >
        WHATELZ.AI
      </Link>

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
