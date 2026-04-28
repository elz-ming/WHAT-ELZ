import { supabaseAdmin } from './supabase-server';

export type ResumeVersion = {
  id: string;
  variant: string;
  content: string;
  pdf_url: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
};


export async function listResumeVersions(): Promise<ResumeVersion[]> {
  const { data, error } = await supabaseAdmin
    .from('resume_versions')
    .select('*')
    .order('variant');
  if (error) throw new Error(`listResumeVersions: ${error.message}`);
  return (data ?? []) as ResumeVersion[];
}

export async function getResumeVersion(variant: string): Promise<ResumeVersion | null> {
  const { data, error } = await supabaseAdmin
    .from('resume_versions')
    .select('*')
    .eq('variant', variant)
    .maybeSingle();
  if (error) throw new Error(`getResumeVersion: ${error.message}`);
  return data as ResumeVersion | null;
}

export async function upsertResumeVersion(
  variant: string,
  content: string,
): Promise<ResumeVersion> {
  const { data, error } = await supabaseAdmin
    .from('resume_versions')
    .upsert(
      { variant, content, updated_at: new Date().toISOString() },
      { onConflict: 'variant' },
    )
    .select()
    .single();
  if (error) throw new Error(`upsertResumeVersion: ${error.message}`);
  return data as ResumeVersion;
}

// ── Section-level editing ─────────────────────────────────────────────────────

function applySectionPatch(markdown: string, section: string, newContent: string): string {
  const lines = markdown.split('\n');
  const headingRe = /^(#{1,3})\s+(.+)$/;
  let startIdx = -1;
  let headingLine = '';

  for (let i = 0; i < lines.length; i++) {
    const m = headingRe.exec(lines[i]);
    if (m && m[2].trim().toLowerCase() === section.trim().toLowerCase()) {
      startIdx = i;
      headingLine = lines[i];
      break;
    }
  }

  if (startIdx === -1) {
    // Section not found — append it
    return markdown.trimEnd() + '\n\n## ' + section + '\n\n' + newContent.trimEnd() + '\n';
  }

  const headingLevel = (headingLine.match(/^(#+)/)?.[1] ?? '##').length;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = headingRe.exec(lines[i]);
    if (m && m[1].length <= headingLevel) { endIdx = i; break; }
  }

  const result = [
    ...lines.slice(0, startIdx),
    headingLine,
    '',
    ...newContent.trimEnd().split('\n'),
    '',
    ...lines.slice(endIdx),
  ].join('\n').replace(/\n{3,}/g, '\n\n');

  return result;
}

export async function patchResumeSection(
  variant: string,
  section: string,
  content: string,
): Promise<{ variant: string; section: string; updated_at: string }> {
  const version = await getResumeVersion(variant);
  if (!version) throw new Error(`Variant not found: ${variant}`);
  const updated = applySectionPatch(version.content, section, content);
  const saved = await upsertResumeVersion(variant, updated);
  return { variant: saved.variant, section, updated_at: saved.updated_at };
}

export async function appendResumeSection(
  variant: string,
  heading: string,
  content: string,
  level: number = 2,
): Promise<{ variant: string; heading: string; updated_at: string }> {
  const version = await getResumeVersion(variant);
  if (!version) throw new Error(`Variant not found: ${variant}`);
  const prefix = '#'.repeat(Math.min(Math.max(level, 1), 3));
  const appended = version.content.trimEnd() + `\n\n${prefix} ${heading}\n\n` + content.trimEnd() + '\n';
  const saved = await upsertResumeVersion(variant, appended);
  return { variant: saved.variant, heading, updated_at: saved.updated_at };
}

export async function setResumeVersionPdf(
  variant: string,
  pdf_url: string,
  pdf_path: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('resume_versions')
    .update({ pdf_url, pdf_path, updated_at: new Date().toISOString() })
    .eq('variant', variant);
  if (error) throw new Error(`setResumeVersionPdf: ${error.message}`);
}
