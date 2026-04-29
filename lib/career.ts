import { supabaseAdmin } from './supabase-server';

export type CareerEntry = {
  id: string;
  slug: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export async function listCareer(publishedOnly = false): Promise<CareerEntry[]> {
  const q = supabaseAdmin.from('career').select('*').order('start_date', { ascending: false });
  if (publishedOnly) q.eq('published', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getCareerBySlug(slug: string): Promise<CareerEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('career').select('*').eq('slug', slug).eq('published', true)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCareer(entry: Omit<CareerEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<CareerEntry> {
  const { data, error } = await supabaseAdmin
    .from('career').upsert({ ...entry, updated_at: new Date().toISOString() })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteCareer(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('career').delete().eq('id', id);
  if (error) throw error;
}
