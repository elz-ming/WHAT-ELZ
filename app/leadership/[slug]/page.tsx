import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listLeadership, getLeadershipBySlug } from '@/lib/leadership';
import { ContentRenderer } from '@/components/shell/ContentRenderer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const entries = await listLeadership(true);
  return entries.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getLeadershipBySlug(slug);
  if (!entry) return {};
  return { title: `${entry.role} — ${entry.organisation} — Edmund Lin Zhenming` };
}

function formatPeriod(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

export default async function LeadershipDetailPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getLeadershipBySlug(slug);
  if (!entry) notFound();

  return (
    <section className="px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/leadership"
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-900"
        >
          ← Leadership
        </Link>

        <div className="mt-8 space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            {formatPeriod(entry.start_date, entry.end_date)}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {entry.role}
          </h1>
          <p className="text-lg font-medium text-zinc-700">{entry.organisation}</p>
          {entry.body && (
            <p className="text-zinc-500">{entry.body}</p>
          )}
        </div>

        {entry.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.tags.map(t => (
              <span key={t} className="font-mono text-xs text-zinc-400">#{t}</span>
            ))}
          </div>
        )}

        {entry.description && entry.description.trim() && (
          <div className="mt-10 prose prose-zinc prose-sm max-w-none">
            <p className="text-zinc-700 leading-relaxed">{entry.description}</p>
          </div>
        )}

        {entry.content && (
          <div className="mt-10 border-t border-zinc-100 pt-10">
            <ContentRenderer content={entry.content} />
          </div>
        )}

        <div className="mt-16 border-t border-zinc-200 pt-8">
          <Link
            href="/leadership"
            className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-900"
          >
            ← All leadership
          </Link>
        </div>
      </div>
    </section>
  );
}
