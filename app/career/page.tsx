import Link from 'next/link';
import { listCareer } from '@/lib/career';
import type { CareerEntry } from '@/lib/career';
import { PageShell } from '@/components/shell/PageShell';

export const dynamic = 'force-dynamic';

function formatDateRange(start: string, end: string | null): string {
  const startDate = new Date(start).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  if (!end) return `${startDate} – Present`;
  const endDate = new Date(end).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  return `${startDate} – ${endDate}`;
}

export default async function CareerPage() {
  const entries = await listCareer(true);

  // Group by slug, keeping order from first occurrence (sorted start_date DESC)
  const slugOrder: string[] = [];
  const bySlug = new Map<string, CareerEntry[]>();
  for (const entry of entries) {
    if (!bySlug.has(entry.slug)) {
      slugOrder.push(entry.slug);
      bySlug.set(entry.slug, []);
    }
    bySlug.get(entry.slug)!.push(entry);
  }

  return (
    <PageShell
      title="Career"
      description="Experience across data science, product management, and AI engineering."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Company</th>
              <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-8">Role</th>
              <th className="pb-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400">Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {slugOrder.map(slug => {
              const roles = bySlug.get(slug)!;
              const latest = roles[0];
              return (
                <tr key={slug} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 pr-8 font-medium text-zinc-900 whitespace-nowrap">
                    <Link href={`/career/${slug}`} className="hover:underline underline-offset-2">
                      {latest.company}
                    </Link>
                  </td>
                  <td className="py-4 pr-8 text-zinc-600 whitespace-nowrap">
                    {roles.length > 1 ? (
                      <span>
                        {latest.role}
                        <span className="ml-1.5 font-mono text-[10px] text-zinc-400">+{roles.length - 1} more</span>
                      </span>
                    ) : (
                      latest.role
                    )}
                  </td>
                  <td className="py-4 font-mono text-xs text-zinc-500 whitespace-nowrap">
                    {formatDateRange(latest.start_date, latest.end_date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <p className="py-12 text-center font-mono text-xs uppercase tracking-widest text-zinc-300">
            No entries yet.
          </p>
        )}
      </div>
    </PageShell>
  );
}
