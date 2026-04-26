import Link from 'next/link';
import { listApplications } from '@/lib/supabase-jobs';
import { ApplicationPipeline } from '@/components/admin/apply/ApplicationPipeline';

export default async function ApplyPage() {
  const applications = await listApplications();
  const ready = applications.filter(a => a.status === 'ready').length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Apply</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {ready > 0
              ? `${ready} application${ready > 1 ? 's' : ''} ready to send.`
              : 'No applications ready to send.'}
          </p>
        </div>
        <Link
          href="/admin/apply/resume"
          className="text-sm px-4 py-2 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        >
          Resume Builder →
        </Link>
      </div>
      <ApplicationPipeline initialApplications={applications} />
    </div>
  );
}
