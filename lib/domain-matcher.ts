import { supabaseAdmin } from './supabase-server';

function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match?.[1]?.toLowerCase().trim() ?? '';
}

function domainToCompanyHint(domain: string): string {
  return domain
    .replace(/\.(com|io|co|ai|sg|net|org|xyz)(\.[a-z]{2})?$/, '')
    .replace(/^(mail|jobs|careers|recruiting|hr|noreply|no-reply)\./, '')
    .toLowerCase();
}

export async function matchEmailToApplication(
  fromAddress: string,
): Promise<{ companyId: string | null; applicationId: string | null }> {
  const domain = extractDomain(fromAddress);
  if (!domain) return { companyId: null, applicationId: null };

  const hint = domainToCompanyHint(domain);

  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .ilike('name', `%${hint}%`)
    .limit(5);

  const company = companies?.[0] ?? null;
  if (!company) return { companyId: null, applicationId: null };

  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('id, job_listings(company_id)')
    .in('status', ['submitted', 'acknowledged', 'interviewing'])
    .order('created_at', { ascending: false })
    .limit(20);

  type AppRow = { id: string; job_listings: { company_id: string }[] };
  const linked = (apps ?? [] as AppRow[]).find((a: AppRow) =>
    a.job_listings?.some(jl => jl.company_id === company.id)
  );

  return {
    companyId:     company.id,
    applicationId: linked?.id ?? null,
  };
}
