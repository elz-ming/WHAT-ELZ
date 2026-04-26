import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-server';
import { JobFeed } from '@/components/admin/hunt/JobFeed';
import type { JobListing } from '@/lib/types/jobs';

export default async function HuntPage() {
  const { data } = await supabaseAdmin
    .from('job_listings')
    .select('*')
    .eq('status', 'new')
    .order('match_score', { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Hunt</h1>
          <p className="text-sm text-zinc-500 mt-1">New listings, scored by AI. Shortlist or dismiss.</p>
        </div>
        <Link href="/admin/hunt/companies"
          className="text-sm px-4 py-2 rounded border border-zinc-300 text-zinc-700">
          Companies →
        </Link>
      </div>
      <JobFeed initialListings={(data ?? []) as JobListing[]} />
    </div>
  );
}
