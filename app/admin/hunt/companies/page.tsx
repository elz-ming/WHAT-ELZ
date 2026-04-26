import { supabaseAdmin } from '@/lib/supabase-server';
import { CompanyList } from '@/components/admin/hunt/CompanyList';
import type { Company } from '@/lib/types/jobs';

export default async function CompaniesPage() {
  const { data } = await supabaseAdmin
    .from('companies').select('*').order('priority').order('name');
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Companies</h1>
        <p className="text-sm text-zinc-500 mt-1">Target company watchlist. Active companies are scraped 3× daily.</p>
      </div>
      <CompanyList initialCompanies={(data ?? []) as Company[]} />
    </div>
  );
}
