import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-server';

export const metadata: Metadata = { title: 'Dashboard — whatelz.ai' };

const ALLOWED_EMAIL = 'elz.work22@gmail.com';

const STATUS_ORDER = [
  'draft', 'ready', 'submitted', 'acknowledged',
  'interviewing', 'offered', 'accepted', 'rejected', 'ghosted', 'withdrawn',
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', ready: 'Ready', submitted: 'Submitted',
  acknowledged: 'Acknowledged', interviewing: 'Interviewing',
  offered: 'Offered', accepted: 'Accepted', rejected: 'Rejected',
  ghosted: 'Ghosted', withdrawn: 'Withdrawn',
};

const ACTIVE_STATUSES = ['submitted', 'acknowledged', 'interviewing', 'offered'];

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const user  = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? '';

  if (email !== ALLOWED_EMAIL) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Unauthorized</p>
        <p className="text-sm text-zinc-500">{email} is not allowed here.</p>
        <SignOutButton>
          <button className="mt-4 border border-zinc-300 px-4 py-2 font-mono text-xs tracking-widest uppercase text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  // Fetch all dashboard data in parallel
  const [
    { data: applications },
    { count: newListings },
    { count: shortlisted },
    { count: companies },
    { data: agentRuns },
    { data: recentApps },
  ] = await Promise.all([
    supabaseAdmin.from('applications').select('id, status, updated_at, job_listings(company, role)'),
    supabaseAdmin.from('job_listings').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseAdmin.from('job_listings').select('*', { count: 'exact', head: true }).eq('status', 'shortlisted'),
    supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('agent_runs').select('agent, status, finished_at, items_found').order('finished_at', { ascending: false }).limit(4),
    supabaseAdmin.from('applications').select('id, status, updated_at, job_listings(company, role)').order('updated_at', { ascending: false }).limit(6),
  ]);

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const app of applications ?? []) {
    const s = app.status as string;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  const totalActive  = ACTIVE_STATUSES.reduce((n, s) => n + (statusCounts[s] ?? 0), 0);
  const totalApps    = (applications ?? []).length;
  const readyToSend  = statusCounts['ready'] ?? 0;

  type AppRow = { id: string; status: string; updated_at: string; job_listings: { company: string; role: string }[] | null };

  return (
    <div className="max-w-4xl space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Job Search</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400">{email}</span>
          <SignOutButton>
            <button className="border border-zinc-300 px-3 py-1.5 font-mono text-xs tracking-widest uppercase text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active',      value: totalActive,        href: '/admin/apply', accent: totalActive > 0 },
          { label: 'Ready',       value: readyToSend,        href: '/admin/apply', accent: readyToSend > 0 },
          { label: 'Shortlisted', value: shortlisted ?? 0,   href: '/admin/hunt',  accent: false },
          { label: 'New jobs',    value: newListings ?? 0,   href: '/admin/hunt',  accent: false },
        ].map(({ label, value, href, accent }) => (
          <Link key={label} href={href}
            className="border border-zinc-200 rounded p-4 hover:border-zinc-400 transition-colors">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{label}</p>
            <p className={`mt-2 text-3xl font-black tracking-tight ${accent ? '' : 'text-zinc-900'}`}
               style={accent ? { color: 'var(--accent-text)' } : undefined}>
              {value}
            </p>
          </Link>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Pipeline</p>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {STATUS_ORDER.filter(s => statusCounts[s]).map(s => (
            <div key={s} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-zinc-700">{STATUS_LABEL[s]}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${Math.round(((statusCounts[s] ?? 0) / Math.max(totalApps, 1)) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-sm text-zinc-500 w-4 text-right">{statusCounts[s]}</span>
              </div>
            </div>
          ))}
          {totalApps === 0 && (
            <p className="px-4 py-4 text-sm text-zinc-400">No applications yet. Start from Hunt →</p>
          )}
        </div>
      </section>

      {/* Recent activity + agent runs side by side */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        {/* Recent applications */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Recent</p>
            <Link href="/admin/apply" className="font-mono text-xs text-zinc-400 hover:text-zinc-900">
              View all →
            </Link>
          </div>
          <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
            {(recentApps ?? [] as AppRow[]).map((app: AppRow) => {
              const listing = Array.isArray(app.job_listings) ? app.job_listings[0] ?? null : null;
              return (
                <div key={app.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {listing?.company ?? 'Unknown'} — {listing?.role ?? '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-zinc-400 uppercase">{app.status}</span>
                    <span className="text-xs text-zinc-300">·</span>
                    <span className="text-xs text-zinc-400">{new Date(app.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
            {(recentApps ?? []).length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-400">No applications yet.</p>
            )}
          </div>
        </section>

        {/* Agent runs */}
        <section className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Agent runs</p>
          <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
            {(agentRuns ?? []).map((run, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">{run.agent}</p>
                  <span className={`font-mono text-xs ${run.status === 'completed' ? 'text-zinc-400' : 'text-red-400'}`}>
                    {run.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-400">
                    {run.finished_at ? new Date(run.finished_at as string).toLocaleString() : '—'}
                  </span>
                  {(run.items_found as number | null) != null && (
                    <>
                      <span className="text-xs text-zinc-300">·</span>
                      <span className="text-xs text-zinc-400">{run.items_found as number} found</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(agentRuns ?? []).length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-400">No runs yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Watchlist stat */}
      <div className="border border-zinc-200 rounded px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Company watchlist</p>
          <p className="mt-1 text-sm text-zinc-700">
            <span className="font-semibold text-zinc-900">{companies ?? 0}</span> active companies · scraping Greenhouse, Lever, Ashby 3× daily
          </p>
        </div>
        <Link href="/admin/hunt/companies"
          className="font-mono text-xs text-zinc-400 hover:text-zinc-900 shrink-0 ml-4">
          Manage →
        </Link>
      </div>
    </div>
  );
}
