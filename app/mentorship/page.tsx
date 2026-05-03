import type { Metadata } from 'next';
import Link from 'next/link';
import { listMentorship } from '@/lib/mentorship';
import { PageShell } from '@/components/shell/PageShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mentorship — Edmund Lin Zhenming',
};

function formatPeriod(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

export default async function MentorshipPage() {
  const entries = await listMentorship(true);

  return (
    <PageShell
      title="Mentorship"
      description="Mentorship programmes and mentors who've shaped my thinking."
    >
      {entries.length === 0 ? (
        <p className="font-mono text-sm text-zinc-400">No mentorship entries published yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/mentorship/${entry.slug}`} className="block px-6 py-5 transition-colors hover:bg-zinc-50">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-base font-semibold text-zinc-900">{entry.programme}</p>
                  <p className="text-sm text-zinc-600">{entry.organiser}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    {formatPeriod(entry.start_date, entry.end_date)}
                  </p>
                  {entry.description && (
                    <p className="pt-1 text-sm leading-relaxed text-zinc-600">{entry.description}</p>
                  )}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.tags.map(t => (
                        <span key={t} className="font-mono text-[10px] text-zinc-400">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
