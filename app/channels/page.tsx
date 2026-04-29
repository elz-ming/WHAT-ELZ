'use client';

import { useState } from 'react';
import { channels } from '@/content/channels';

export default function ChannelsPage() {
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <section className="px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Presence</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-zinc-900">
          Channels
        </h1>
        <p className="mt-4 max-w-xl text-zinc-500">
          Same person, four surfaces. Follow whichever format fits.
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
                    <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Platform</th>
                    <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Handle</th>
                    <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Purpose</th>
                    <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {channels.map(ch => (
                    <tr key={ch.name} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 pr-8 font-medium text-zinc-900">{ch.name}</td>
                      <td className="py-4 pr-8 font-mono text-xs text-zinc-500">{ch.handle}</td>
                      <td className="py-4 pr-8 text-zinc-600">{ch.purpose}</td>
                      <td className="py-4">
                        <a
                          href={ch.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                          Visit ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card view */}
          {view === 'card' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {channels.map(ch => (
                <div key={ch.name} className="border border-zinc-200 rounded p-5 space-y-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{ch.name}</p>
                    <p className="font-mono text-xs text-zinc-500 mt-0.5">{ch.handle}</p>
                  </div>
                  <p className="text-sm text-zinc-600">{ch.purpose}</p>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-xs uppercase tracking-widest border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
                  >
                    Follow ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
