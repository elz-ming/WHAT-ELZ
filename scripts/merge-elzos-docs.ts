// Reads elzos.docs_sections, appends new content into public.docs_sections.
// Run ONCE after migration. Idempotent: skips headings that already exist.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function readElzosDoc(slug: string): Promise<Array<{ heading: string; content: string; position: number }>> {
  const { data, error } = await (supabase as any)
    .schema('elzos')
    .from('docs_sections')
    .select('heading, content, position')
    .eq('doc_slug', slug)
    .eq('is_current', true)
    .order('position');
  if (error) { console.warn(`  ⚠ elzos.${slug}: ${error.message}`); return []; }
  return (data as any[]) ?? [];
}

async function maxPosition(slug: string): Promise<number> {
  const { data } = await supabase
    .from('docs_sections')
    .select('position')
    .eq('doc_slug', slug)
    .eq('is_current', true)
    .order('position', { ascending: false })
    .limit(1);
  return (data as any)?.[0]?.position ?? -1;
}

async function headingExists(slug: string, heading: string): Promise<boolean> {
  const { count } = await supabase
    .from('docs_sections')
    .select('id', { count: 'exact', head: true })
    .eq('doc_slug', slug)
    .eq('heading', heading)
    .eq('is_current', true);
  return (count ?? 0) > 0;
}

async function appendSection(slug: string, heading: string, content: string): Promise<void> {
  const exists = await headingExists(slug, heading);
  if (exists) { console.log(`    skip (exists): ${heading}`); return; }
  const pos = await maxPosition(slug) + 1;
  const { error } = await supabase.from('docs_sections').insert({
    doc_slug: slug, heading, content, position: pos, version: 1, is_current: true,
  });
  if (error) throw new Error(`append ${slug}/${heading}: ${error.message}`);
  console.log(`    ✓ appended: ${heading}`);
}

async function main(): Promise<void> {
  console.log('Merging ELZ OS docs into WHATELZ public docs...\n');

  console.log('INSTRUCTIONS: absorbing METHODOLOGY and USERMANUAL');
  for (const s of await readElzosDoc('METHODOLOGY')) {
    await appendSection('INSTRUCTIONS', `[ELZ OS] ${s.heading}`, s.content);
  }
  for (const s of await readElzosDoc('USERMANUAL')) {
    await appendSection('INSTRUCTIONS', `[Admin] ${s.heading}`, s.content);
  }

  console.log('\nCONTEXT: merging ELZ OS context');
  for (const s of await readElzosDoc('CONTEXT')) {
    await appendSection('CONTEXT', `[Profile] ${s.heading}`, s.content);
  }

  console.log('\nBUILD: importing ELZ OS backlog as HUNT module reference');
  const elzosBuild = await readElzosDoc('BUILD');
  const backlog = elzosBuild.find((s: any) => s.heading === 'Backlog');
  if (backlog) {
    await appendSection('BUILD', 'HUNT Module — ELZ OS Backlog (imported)', backlog.content);
    await appendSection('IDEAS', 'ELZ OS deferred features (imported from elzos.BUILD)', backlog.content);
  }

  console.log('\n✅ Doc merge complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
