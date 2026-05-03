import { supabaseAdmin } from './supabase-server';

export type ProjectStatus = 'active' | 'shipped' | 'archived';

export interface ProjectMetric { label: string; value: string }

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  status: ProjectStatus | null;
  type: string | null;
  tech_stack: string[] | null;
  metrics: ProjectMetric[] | null;
  external_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  cover_image_url: string | null;
  content: string | null;
  published: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export async function listProjects(publishedOnly = false): Promise<Project[]> {
  let q = supabaseAdmin.from('projects').select('*');
  if (publishedOnly) q = q.eq('published', true);
  const { data, error } = await q.order('sort_order', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getProject: ${error.message}`);
  return data as Project | null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getProjectBySlug: ${error.message}`);
  return data as Project | null;
}

export async function upsertProject(
  fields: Partial<Project> & { slug: string; name: string },
): Promise<Project> {
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin
    .from('projects')
    .upsert(payload, { onConflict: 'slug' })
    .select()
    .single();
  if (error) throw new Error(`upsertProject: ${error.message}`);
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id);
  if (error) throw new Error(`deleteProject: ${error.message}`);
}
