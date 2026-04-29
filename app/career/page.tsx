'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { arc } from '@/content/arc';

export default function CareerPage() {
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <section className="px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Work History</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-zinc-900">
          Career
        </h1>
        <p className="mt-4 max-w-xl text-zinc-500">
          4 years across data science, product management, and AI engineering.
        </p>

        <div className="mt-10 space-y-4">
          {/* View toggle */}
          <div className="flex items-center justify-end">
            <div className="flex border border-zinc-200 rounded overflow-hidden">
              {(['table', 'card'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                    view === v ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Table view */}
          {view === 'table' && (
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
          )}

          {/* Card view */}
          {view === 'card' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {arc.map((stop, i) => (
                <div key={stop.period} className="border border-zinc-200 rounded p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                        {stop.period}
                      </p>
                      <p className="mt-1 font-semibold text-zinc-900">{stop.company}</p>
                      <p className="text-sm text-zinc-500">{stop.role}</p>
                    </div>
                    <span
                      className="font-mono text-[10px] tracking-widest text-zinc-400 shrink-0"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-700">{stop.shipped}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
