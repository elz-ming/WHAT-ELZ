'use client';

import { type ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  /** Rendered right-aligned in the subheader (e.g. view toggle) */
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export function PageShell({ title, description, actions, children, maxWidth = 'max-w-5xl' }: Props) {
  return (
    <div className="flex flex-col">
      {/* Fixed subheader — sticks at top of the scroll container */}
      <div className="sticky top-0 z-20 shrink-0 border-b border-zinc-200 bg-[var(--background)] px-6 py-4">
        <div className={`mx-auto ${maxWidth} flex items-center justify-between gap-4`}>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h1>
            {description && (
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>

      {/* Page content */}
      <div className={`mx-auto w-full ${maxWidth} px-6 py-6`}>
        {children}
      </div>
    </div>
  );
}

/** Reusable table/card view toggle, for use in PageShell actions */
export function ViewToggle({
  view,
  onChange,
}: {
  view: 'table' | 'card';
  onChange: (v: 'table' | 'card') => void;
}) {
  return (
    <div className="flex border border-zinc-200 rounded overflow-hidden">
      {(['table', 'card'] as const).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
            view === v ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
