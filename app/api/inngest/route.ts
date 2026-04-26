import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { jobDiscovery }    from '@/inngest/functions/job-discovery';
import { morningBriefing } from '@/inngest/functions/morning-briefing';
import { emailSync }       from '@/inngest/functions/email-sync';
import { followUpCheck }   from '@/inngest/functions/follow-up-check';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [jobDiscovery, morningBriefing, emailSync, followUpCheck],
});
