import { supabaseAdmin } from "./supabase-server";

export type DocSlug =
  | "IDEAS"
  | "BUILD"
  | "CONTEXT"
  | "INSTRUCTIONS"
  | "MYSTORY"
  | "INBOX"
  | "BRAND"
  | "LOGS"
  | "LEARNINGS";
export const VALID_SLUGS: DocSlug[] = [
  "IDEAS",
  "BUILD",
  "CONTEXT",
  "INSTRUCTIONS",
  "MYSTORY",
  "INBOX",
  "BRAND",
  "LOGS",
  "LEARNINGS",
];

type SectionRow = {
  id: string;
  doc_slug: string;
  heading: string;
  position: number;
  content: string;
  version: number;
  is_current: boolean;
  updated_at: string;
};

// Helper: snapshot current state into versions table before mutating
async function snapshotVersion(row: SectionRow, capturedBy = "unknown") {
  const { error } = await supabaseAdmin.from("docs_section_versions").insert({
    section_id: row.id,
    doc_slug: row.doc_slug,
    heading: row.heading,
    position: row.position,
    content: row.content,
    version: row.version,
    captured_by: capturedBy,
  });
  if (error) throw new Error(`version_snapshot_failed: ${error.message}`);
}

// 1. list_sections
export async function listSections(doc_slug: DocSlug) {
  const { data, error } = await supabaseAdmin
    .from("docs_sections")
    .select("heading, position, version, updated_at, content")
    .eq("doc_slug", doc_slug)
    .eq("is_current", true)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return {
    sections: (data ?? []).map((r) => ({
      heading: r.heading,
      position: r.position,
      version: r.version,
      updated_at: r.updated_at,
      preview: r.content.slice(0, 120),
    })),
  };
}

// 2. read_section
export async function readSection(doc_slug: DocSlug, heading: string) {
  const { data, error } = await supabaseAdmin
    .from("docs_sections")
    .select("heading, content, version, updated_at")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { error: "section_not_found", doc_slug, heading };
  return data;
}

// 3. read_doc
export async function readDoc(doc_slug: DocSlug) {
  const { data, error } = await supabaseAdmin
    .from("docs_sections")
    .select("heading, content, position, version, updated_at")
    .eq("doc_slug", doc_slug)
    .eq("is_current", true)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const content = rows
    .map((r) => `## ${r.heading}\n\n${r.content}`)
    .join("\n\n");
  return {
    doc_slug,
    content,
    sections: rows.map((r) => ({
      heading: r.heading,
      position: r.position,
      version: r.version,
      updated_at: r.updated_at,
    })),
    generated_at: new Date().toISOString(),
  };
}

// 4. create_section
export async function createSection(
  doc_slug: DocSlug,
  heading: string,
  content: string,
  position?: number,
) {
  const { data: existing } = await supabaseAdmin
    .from("docs_sections")
    .select("id")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();
  if (existing) return { error: "duplicate_heading", doc_slug, heading };

  let finalPosition = position;
  if (finalPosition === undefined) {
    const { data: maxRow } = await supabaseAdmin
      .from("docs_sections")
      .select("position")
      .eq("doc_slug", doc_slug)
      .eq("is_current", true)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    finalPosition = maxRow ? maxRow.position + 1 : 0;
  } else {
    await supabaseAdmin.rpc("shift_positions_up", {
      p_slug: doc_slug,
      p_from: finalPosition,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("docs_sections")
    .insert({ doc_slug, heading, position: finalPosition, content, version: 1 })
    .select("heading, position, version")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// 5. append_section
export async function appendSection(
  doc_slug: DocSlug,
  heading: string,
  content: string,
  create_if_missing = true,
) {
  const { data: existing } = await supabaseAdmin
    .from("docs_sections")
    .select("id, doc_slug, heading, position, content, version")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();

  if (!existing) {
    if (!create_if_missing)
      return { error: "section_not_found", doc_slug, heading };
    return createSection(doc_slug, heading, content);
  }

  await snapshotVersion(existing as SectionRow, "append");
  const newContent = existing.content + "\n\n" + content;
  const newVersion = existing.version + 1;
  const { error } = await supabaseAdmin
    .from("docs_sections")
    .update({ content: newContent, version: newVersion })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  return { heading, version: newVersion };
}

// 6. patch_section (version-guarded)
export async function patchSection(
  doc_slug: DocSlug,
  heading: string,
  content: string,
  expected_version: number,
  captured_by = "unknown",
) {
  const { data: row } = await supabaseAdmin
    .from("docs_sections")
    .select("*")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();

  if (!row) return { error: "section_not_found", doc_slug, heading };
  if (row.version !== expected_version) {
    return {
      error: "version_conflict",
      current_version: row.version,
      current_content: row.content,
    };
  }

  await snapshotVersion(row as SectionRow, captured_by);
  const newVersion = row.version + 1;
  const { error } = await supabaseAdmin
    .from("docs_sections")
    .update({ content, version: newVersion })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { heading, version: newVersion };
}

// 7. rename_section (version-guarded)
export async function renameSection(
  doc_slug: DocSlug,
  heading: string,
  new_heading: string,
  expected_version: number,
) {
  const { data: row } = await supabaseAdmin
    .from("docs_sections")
    .select("*")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();

  if (!row) return { error: "section_not_found", doc_slug, heading };
  if (row.version !== expected_version) {
    return {
      error: "version_conflict",
      current_version: row.version,
      current_content: row.content,
    };
  }

  const { data: dup } = await supabaseAdmin
    .from("docs_sections")
    .select("id")
    .eq("doc_slug", doc_slug)
    .eq("heading", new_heading)
    .eq("is_current", true)
    .maybeSingle();
  if (dup)
    return { error: "duplicate_heading", doc_slug, heading: new_heading };

  await snapshotVersion(row as SectionRow, "rename");
  const newVersion = row.version + 1;
  const { error } = await supabaseAdmin
    .from("docs_sections")
    .update({ heading: new_heading, version: newVersion })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { heading, new_heading, version: newVersion };
}

// 8. move_section (version-guarded, insert-at-N semantics)
export async function moveSection(
  doc_slug: DocSlug,
  heading: string,
  new_position: number,
  expected_version: number,
) {
  const { data: row } = await supabaseAdmin
    .from("docs_sections")
    .select("*")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();

  if (!row) return { error: "section_not_found", doc_slug, heading };
  if (row.version !== expected_version) {
    return {
      error: "version_conflict",
      current_version: row.version,
      current_content: row.content,
    };
  }

  const old_position = row.position;
  if (old_position === new_position) {
    return { heading, old_position, new_position, version: row.version };
  }

  await snapshotVersion(row as SectionRow, "move");

  const { error } = await supabaseAdmin.rpc("move_section_atomic", {
    p_slug: doc_slug,
    p_section_id: row.id,
    p_old_position: old_position,
    p_new_position: new_position,
  });
  if (error) throw new Error(error.message);

  const newVersion = row.version + 1;
  await supabaseAdmin
    .from("docs_sections")
    .update({ version: newVersion })
    .eq("id", row.id);

  return { heading, old_position, new_position, version: newVersion };
}

// 9. delete_section (soft-delete, version-guarded)
export async function deleteSection(
  doc_slug: DocSlug,
  heading: string,
  expected_version: number,
) {
  const { data: row } = await supabaseAdmin
    .from("docs_sections")
    .select("*")
    .eq("doc_slug", doc_slug)
    .eq("heading", heading)
    .eq("is_current", true)
    .maybeSingle();

  if (!row) return { error: "section_not_found", doc_slug, heading };
  if (row.version !== expected_version) {
    return {
      error: "version_conflict",
      current_version: row.version,
      current_content: row.content,
    };
  }

  await snapshotVersion(row as SectionRow, "delete");
  const newVersion = row.version + 1;
  const { error } = await supabaseAdmin
    .from("docs_sections")
    .update({ is_current: false, version: newVersion })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { heading, deleted: true, version: newVersion };
}

// 11. list_docs
export async function listDocs() {
  const { data, error } = await supabaseAdmin
    .from("docs_sections")
    .select("doc_slug, updated_at")
    .eq("is_current", true);
  if (error) throw new Error(error.message);
  const map = new Map<
    string,
    { doc_slug: string; section_count: number; last_updated: string | null }
  >();
  for (const slug of VALID_SLUGS) {
    map.set(slug, { doc_slug: slug, section_count: 0, last_updated: null });
  }
  for (const row of data ?? []) {
    const cur = map.get(row.doc_slug);
    if (!cur) continue;
    map.set(row.doc_slug, {
      doc_slug: cur.doc_slug,
      section_count: cur.section_count + 1,
      last_updated:
        !cur.last_updated || row.updated_at > cur.last_updated
          ? row.updated_at
          : cur.last_updated,
    });
  }
  return Array.from(map.values());
}

// 10. list_recent_changes
export async function listRecentChanges(doc_slug?: DocSlug, limit = 20) {
  let query = supabaseAdmin
    .from("docs_sections")
    .select("doc_slug, heading, version, updated_at, is_current")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (doc_slug) query = query.eq("doc_slug", doc_slug);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    doc_slug: r.doc_slug,
    heading: r.heading,
    version: r.version,
    updated_at: r.updated_at,
    change_type: r.is_current ? "update" : "delete",
  }));
}
