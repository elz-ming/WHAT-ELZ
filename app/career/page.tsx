'use client';

import { useState } from 'react';
import { arc } from '@/content/arc';
import { PageShell, ViewToggle } from '@/components/shell/PageShell';

export default function CareerPage() {
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <PageShell
      title="Career"
      description="4 years across data science, product management, and AI engineering."
      actions={<ViewToggle view={view} onChange={setView} />}
    >
      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Company</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Role</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Period</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">Shipped</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {arc.map(stop => (
                <tr key={stop.period} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 pr-8 font-medium text-zinc-900 whitespace-nowrap">{stop.company}</td>
                  <td className="py-4 pr-8 text-zinc-600 whitespace-nowrap">{stop.role}</td>
                  <td className="py-4 pr-8 font-mono text-xs text-zinc-500 whitespace-nowrap">{stop.period}</td>
                  <td className="py-4 text-zinc-600 leading-relaxed">{stop.shipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {arc.map((stop, i) => (
            <div key={stop.period} className="border border-zinc-200 rounded p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{stop.period}</p>
                  <p className="mt-1 font-semibold text-zinc-900">{stop.company}</p>
                  <p className="text-sm text-zinc-500">{stop.role}</p>
                </div>
                <span className="font-mono text-[10px] tracking-widest shrink-0" style={{ color: 'var(--accent-text)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-700">{stop.shipped}</p>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
