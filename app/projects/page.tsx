'use client';

import { useState } from 'react';
import { projects, elzOs } from '@/content/projects';
import type { ProjectStatus } from '@/content/types';
import { PageShell, ViewToggle } from '@/components/shell/PageShell';

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active:  'bg-green-50 text-green-700',
  shipped: 'bg-zinc-100 text-zinc-600',
  draft:   'bg-zinc-50 text-zinc-400',
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<'table' | 'card'>('table');
  const visible = elzOs ? [...projects, elzOs] : projects;

  return (
    <PageShell
      title="Projects"
      description="Full-stack builds — production systems, not demos."
      actions={<ViewToggle view={view} onChange={setView} />}
    >
      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Name</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Status</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Stack</th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map(p => (
                <tr key={p.slug} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 pr-8">
                    <p className="font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{p.tagline}</p>
                  </td>
                  <td className="py-4 pr-8"><StatusBadge status={p.status} /></td>
                  <td className="py-4 pr-8 text-xs text-zinc-500">
                    {p.stack.slice(0, 4).join(', ')}{p.stack.length > 4 ? ', …' : ''}
                  </td>
                  <td className="py-4">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-zinc-400 hover:text-zinc-900 transition-colors">
                        Visit ↗
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {visible.map(p => (
            <div key={p.slug} className="border border-zinc-200 rounded p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{p.name}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{p.tagline}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm leading-relaxed text-zinc-700">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.stack.map(s => (
                  <span key={s} className="font-mono text-[10px] uppercase tracking-wide bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  className="inline-block font-mono text-xs uppercase tracking-widest border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors">
                  View project ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
