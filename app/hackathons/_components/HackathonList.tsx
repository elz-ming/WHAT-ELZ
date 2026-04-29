'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Hackathon } from '@/lib/hackathons';
import { awardRankScore } from '@/lib/hackathons';
import { useIsDesktop } from '@/lib/shell/use-is-desktop';

function blinkRow(el: HTMLElement, onDone: () => void) {
  const flash = 'rgba(250,204,21,0.35)';
  el.style.transition = 'background-color 200ms ease';
  el.style.backgroundColor = flash;
  setTimeout(() => { el.style.backgroundColor = ''; }, 300);
  setTimeout(() => { el.style.backgroundColor = flash; }, 600);
  setTimeout(() => {
    el.style.backgroundColor = '';
    el.style.transition = '';
    onDone();
  }, 1000);
}

type DateSort = 'desc' | 'asc' | 'none';

const AWARD_COLOURS: Record<string, string> = {
  champion:      'bg-amber-100 text-amber-700',
  'first place': 'bg-amber-100 text-amber-700',
  '1st place':   'bg-amber-100 text-amber-700',
  'second place':'bg-zinc-100  text-zinc-600',
  '2nd place':   'bg-zinc-100  text-zinc-600',
  'third place': 'bg-orange-100 text-orange-600',
  '3rd place':   'bg-orange-100 text-orange-600',
  finalist:      'bg-blue-50   text-blue-600',
  'special award':'bg-violet-50 text-violet-600',
};

function awardColour(title: string) {
  const key = title.toLowerCase();
  for (const [pattern, cls] of Object.entries(AWARD_COLOURS)) {
    if (key.includes(pattern)) return cls;
  }
  return 'bg-zinc-100 text-zinc-500';
}

function AwardBadge({ award }: { award: { title: string; track?: string } }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${awardColour(award.title)}`}>
      {award.title}{award.track ? ` · ${award.track}` : ''}
    </span>
  );
}

export function HackathonList({ hackathons, highlight }: { hackathons: Hackathon[]; highlight?: string }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<'table' | 'card'>('card');
  const [dateSort, setDateSort] = useState<DateSort>('none');

  useEffect(() => {
    setView(isDesktop ? 'table' : 'card');
  }, [isDesktop]);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-hackathon-id="${highlight}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const target = hackathons.find(h => h.id === highlight);
      const dest = target?.slug ? `/hackathons/${target.slug}` : `/hackathons`;
      setTimeout(() => blinkRow(el, () => router.push(dest)), 400);
    }, 350);
    return () => clearTimeout(t);
  }, [highlight, router, hackathons]);

  function cycleDate() {
    setDateSort(d => d === 'none' ? 'desc' : d === 'desc' ? 'asc' : 'none');
  }

  const sorted = useMemo(() => {
    const copy = [...hackathons];
    if (dateSort !== 'none') {
      copy.sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return dateSort === 'desc' ? -diff : diff;
      });
    } else {
      copy.sort((a, b) => {
        const rankDiff = awardRankScore(a.awards) - awardRankScore(b.awards);
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return copy;
  }, [hackathons, dateSort]);

  const dateSortIcon = dateSort === 'desc' ? ' ↓' : dateSort === 'asc' ? ' ↑' : '';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
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
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-6">
                  Hackathon
                </th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-6">
                  Awards
                </th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest pr-6">
                  <button
                    onClick={cycleDate}
                    className="text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest font-mono text-[10px]"
                  >
                    Date{dateSortIcon}
                  </button>
                </th>
                <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map(h => (
                <tr
                  key={h.id}
                  data-hackathon-id={h.id}
                  onClick={() => router.push(`/hackathons/${h.slug}`)}
                  className="cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <td className="py-4 pr-6">
                    <p className="font-medium text-zinc-900">{h.name}</p>
                    {h.project_name && <p className="text-xs text-zinc-500 mt-0.5">{h.project_name}</p>}
                    {h.organizer && <p className="text-xs text-zinc-400 mt-0.5">{h.organizer}</p>}
                  </td>
                  <td className="py-4 pr-6">
                    <div className="flex flex-wrap gap-1">
                      {h.awards.length > 0
                        ? h.awards.map((a, i) => <AwardBadge key={i} award={a} />)
                        : <span className="font-mono text-[10px] text-zinc-300">—</span>
                      }
                    </div>
                  </td>
                  <td className="py-4 pr-6 font-mono text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(h.date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 text-xs text-zinc-500">{h.location ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card view */}
      {view === 'card' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(h => (
            <button
              key={h.id}
              data-hackathon-id={h.id}
              onClick={() => router.push(`/hackathons/${h.slug}`)}
              className="text-left border border-zinc-200 rounded p-5 hover:border-zinc-400 transition-colors space-y-3"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  {new Date(h.date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
                  {h.location ? ` · ${h.location}` : ''}
                </p>
                <p className="mt-1 font-medium text-zinc-900 leading-snug">{h.name}</p>
                {h.project_name && <p className="text-xs text-zinc-500 mt-0.5">{h.project_name}</p>}
                {h.organizer && <p className="text-xs text-zinc-400 mt-0.5">{h.organizer}</p>}
              </div>
              {h.awards.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {h.awards.map((a, i) => <AwardBadge key={i} award={a} />)}
                </div>
              )}
              {h.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {h.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] text-zinc-400">#{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
