import { supabaseAdmin } from '@/lib/supabase-server';
import { EmailThread }   from '@/components/admin/listen/EmailThread';

type EmailRow = {
  id: string;
  from_address: string;
  subject: string;
  body_text: string;
  direction: 'inbound' | 'outbound';
  received_at: string;
  is_flagged: boolean;
  applications?: { id: string; status: string; job_listings?: { company: string; role: string } | null } | null;
};

export default async function ListenPage() {
  const { data } = await supabaseAdmin
    .from('emails')
    .select('*, applications(id, status, job_listings(company, role))')
    .order('received_at', { ascending: false })
    .limit(100);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Listen</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Job-related emails from elz.work22@gmail.com. Syncs every 30 minutes.
        </p>
      </div>
      <EmailThread emails={(data ?? []) as EmailRow[]} />
    </div>
  );
}
