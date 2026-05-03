import type { Metadata } from 'next';
import Link from 'next/link';
import { listLeadership } from '@/lib/leadership';
import { PageShell } from '@/components/shell/PageShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leadership — Edmund Lin Zhenming',
};

function formatPeriod(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

export default async function LeadershipPage() {
  const entries = await listLeadership(true);

  return (
    <PageShell
      title="Leadership"
      description="Clubs, organisations, and committees I've led or contributed to."
    >
      {entries.length === 0 ? (
        <p className="font-mono text-sm text-zinc-400">No leadership entries published yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => (
            <Link key={entry.id} href={`/leadership/${entry.slug}`}>
            <article className="rounded border border-zinc-200 p-6 space-y-3 transition-colors hover:border-zinc-400">
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--accent-text)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  {formatPeriod(entry.start_date, entry.end_date)}
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                  {entry.organisation}
                </h2>
                {entry.body && (
                  <p className="mt-0.5 text-sm text-zinc-500">{entry.body}</p>
                )}
                <p className="mt-1 text-sm text-zinc-600">{entry.role}</p>
              </div>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] text-zinc-400">#{t}</span>
                  ))}
                </div>
              )}
              {entry.description && (
                <p className="text-sm leading-relaxed text-zinc-600">
                  {entry.description.split('\n').find(l => l.trim())?.replace(/^[-*•]\s*/, '').trim()}
                </p>
              )}
            </article>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
