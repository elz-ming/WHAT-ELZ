import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scrapeCompany } from '@/lib/ats-scraper';
import { scoreListings } from '@/lib/job-scorer';
import { shouldReject } from '@/lib/job-filter';
import type { Company } from '@/lib/types/jobs';

export const jobDiscovery = inngest.createFunction(
  { id: 'job-discovery', name: 'Job Discovery', triggers: [{ cron: 'TZ=Asia/Singapore 0 6,12,18 * * *' }] },
  async ({ step }) => {
    const companies = await step.run('fetch-companies', async () => {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('id, name, ats_type, ats_slug')
        .eq('status', 'active')
        .not('ats_type', 'is', null)
        .not('ats_slug', 'is', null);
      return (data ?? []) as Pick<Company, 'id' | 'name' | 'ats_type' | 'ats_slug'>[];
    });

    let newListings = 0;

    for (const company of companies) {
      const raw = await step.run(`scrape-${company.id}`, () =>
        scrapeCompany(company.ats_type, company.ats_slug, company.name)
      );
      if (raw.length === 0) continue;

      const { data: sourceRow } = await supabaseAdmin
        .from('job_sources')
        .select('id')
        .eq('name', company.ats_type!.toLowerCase())
        .single();
      const source_id = sourceRow?.id ?? null;

      const toInsert = raw.map(r => ({
        source_id,
        company_id:   company.id,
        external_id:  r.external_id,
        external_url: r.external_url,
        company:      r.company,
        role:         r.role,
        location:     r.location,
        remote_type:  r.remote_type,
        description:  r.description,
        posted_at:    r.posted_at,
        status:       shouldReject(r.role) ? 'rejected_by_user' : 'new',
        source:       'derived',
      }));

      const { data: inserted } = await supabaseAdmin
        .from('job_listings')
        .upsert(toInsert, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
        .select('id, role, company, description, status');

      newListings += (inserted ?? []).filter((r: { status: string }) => r.status === 'new').length;

      const unscored = (inserted ?? []).filter((r: { id: string; status: string }) => r.status === 'new') as Array<{ id: string; role: string; company: string; description: string | null }>;
      if (unscored.length > 0) {
        const scores = await scoreListings(
          unscored.map(r => ({ id: r.id, role: r.role, company: r.company, description: r.description }))
        );
        for (const [id, score] of scores) {
          await supabaseAdmin
            .from('job_listings')
            .update({
              match_score:     score.match_score,
              score_breakdown: score.score_breakdown,
              score_reasoning: score.score_reasoning,
              status: score.match_score >= 0.75 ? 'shortlisted' : 'new',
            })
            .eq('id', id);
        }
      }

      await supabaseAdmin
        .from('companies')
        .update({ last_checked_at: new Date().toISOString(), last_fetch_count: raw.length })
        .eq('id', company.id);
    }

    await supabaseAdmin.from('agent_runs').insert({
      agent:       'job-discovery',
      status:      'completed',
      finished_at: new Date().toISOString(),
      items_found: newListings,
    });

    return { companiesChecked: companies.length, newListings };
  },
);
