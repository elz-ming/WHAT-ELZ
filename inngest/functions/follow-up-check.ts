import { inngest }       from '../client';
import { supabaseAdmin } from '@/lib/supabase-server';

export const followUpCheck = inngest.createFunction(
  { id: 'follow-up-check', name: 'Follow-up Check', triggers: [{ cron: 'TZ=Asia/Singapore 0 9 * * *' }] },
  async () => {
    const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

    const { data: overdue } = await supabaseAdmin
      .from('applications')
      .select('id, job_listings(company, role)')
      .eq('status', 'submitted')
      .is('response_status', null)
      .lt('applied_at', cutoff);

    for (const app of overdue ?? []) {
      const listing = (app as { id: string; job_listings?: { company?: string; role?: string } | null }).job_listings;
      await supabaseAdmin.from('notifications').insert({
        module:      'LISTEN',
        title:       `Follow up: ${listing?.company ?? 'Unknown'}`,
        body:        `${listing?.role ?? 'Role'} — no response in 14 days`,
        priority:    'normal',
        action_type: 'open_application',
        action_id:   app.id,
      });
    }

    return { overdueCount: (overdue ?? []).length };
  },
);
