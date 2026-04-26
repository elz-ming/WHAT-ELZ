import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase-server';

export const morningBriefing = inngest.createFunction(
  { id: 'morning-briefing', name: 'Morning Briefing', triggers: [{ cron: 'TZ=Asia/Singapore 0 8 * * *' }] },
  async ({ step }) => {
    const summary = await step.run('build-summary', async () => {
      const [{ count: shortlistedJobs }, { count: readyApplications }] = await Promise.all([
        supabaseAdmin
          .from('job_listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shortlisted'),
        supabaseAdmin
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ready'),
      ]);
      return {
        shortlistedJobs:   shortlistedJobs  ?? 0,
        readyApplications: readyApplications ?? 0,
      };
    });

    await supabaseAdmin.from('agent_runs').insert({
      agent:       'morning-briefing',
      status:      'completed',
      finished_at: new Date().toISOString(),
      metadata:    summary,
    });

    return summary;
  },
);
