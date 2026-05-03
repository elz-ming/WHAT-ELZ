import { supabaseAdmin } from './supabase-server';

export interface Channel {
  id: string;
  name: string;
  handle: string;
  url: string;
  purpose: string | null;
  published: boolean;
  sort_order: number | null;
}

export async function listChannels(publishedOnly = false): Promise<Channel[]> {
  let q = supabaseAdmin.from('channels').select('*');
  if (publishedOnly) q = q.eq('published', true);
  const { data, error } = await q.order('sort_order', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`listChannels: ${error.message}`);
  return (data ?? []) as Channel[];
}

export async function upsertChannel(
  fields: Partial<Channel> & { name: string; handle: string; url: string },
): Promise<Channel> {
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin
    .from('channels')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(`upsertChannel: ${error.message}`);
  return data as Channel;
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('channels').delete().eq('id', id);
  if (error) throw new Error(`deleteChannel: ${error.message}`);
}
