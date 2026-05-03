import { supabaseAdmin } from './supabase-server';

export type Leadership = {
  id: string;
  slug: string;
  organisation: string;
  body: string | null;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  tags: string[];
  published: boolean;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export async function listLeadership(publishedOnly = false): Promise<Leadership[]> {
  let q = supabaseAdmin.from('leadership').select('*');
  if (publishedOnly) q = q.eq('published', true);
  const { data, error } = await q.order('start_date', { ascending: false });
  if (error) throw new Error(`listLeadership: ${error.message}`);
  return (data ?? []) as Leadership[];
}

export async function getLeadershipBySlug(slug: string): Promise<Leadership | null> {
  const { data, error } = await supabaseAdmin
    .from('leadership')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) throw new Error(`getLeadershipBySlug: ${error.message}`);
  return data as Leadership | null;
}

export async function getLeadership(id: string): Promise<Leadership | null> {
  const { data, error } = await supabaseAdmin
    .from('leadership')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getLeadership: ${error.message}`);
  return data as Leadership | null;
}

export async function upsertLeadership(
  fields: Partial<Leadership> & { slug: string; organisation: string; role: string; start_date: string },
  id?: string,
): Promise<Leadership> {
  const payload = { ...fields, updated_at: new Date().toISOString(), ...(id ? { id } : {}) };
  const { data, error } = await supabaseAdmin
    .from('leadership')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsertLeadership: ${error.message}`);
  return data as Leadership;
}

export async function deleteLeadership(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('leadership').delete().eq('id', id);
  if (error) throw new Error(`deleteLeadership: ${error.message}`);
}
