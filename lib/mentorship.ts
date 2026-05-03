import { supabaseAdmin } from './supabase-server';

export type Mentorship = {
  id: string;
  slug: string;
  programme: string;
  organiser: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  tags: string[];
  published: boolean;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export async function listMentorship(publishedOnly = false): Promise<Mentorship[]> {
  let q = supabaseAdmin.from('mentorship').select('*');
  if (publishedOnly) q = q.eq('published', true);
  const { data, error } = await q.order('start_date', { ascending: false });
  if (error) throw new Error(`listMentorship: ${error.message}`);
  return (data ?? []) as Mentorship[];
}

export async function getMentorship(id: string): Promise<Mentorship | null> {
  const { data, error } = await supabaseAdmin
    .from('mentorship')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getMentorship: ${error.message}`);
  return data as Mentorship | null;
}

export async function upsertMentorship(
  fields: Partial<Mentorship> & { slug: string; programme: string; organiser: string; start_date: string },
  id?: string,
): Promise<Mentorship> {
  const payload = { ...fields, updated_at: new Date().toISOString(), ...(id ? { id } : {}) };
  const { data, error } = await supabaseAdmin
    .from('mentorship')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsertMentorship: ${error.message}`);
  return data as Mentorship;
}

export async function deleteMentorship(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('mentorship').delete().eq('id', id);
  if (error) throw new Error(`deleteMentorship: ${error.message}`);
}
