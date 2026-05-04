import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import {
  Document,
  Font,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);
import { getResumeVersion, setResumeVersionPdf } from '@/lib/resume-versions';
import { supabaseAdmin } from '@/lib/supabase-server';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#171717', lineHeight: 1.45 },
  // Header
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  name:         { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#171717' },
  variantLabel: { fontSize: 7.5, fontFamily: 'Helvetica', color: '#71717a', letterSpacing: 0.3 },
  divider:      { borderBottomWidth: 1, borderBottomColor: '#d4d4d8', marginBottom: 10 },
  // Body columns
  body:         { flexDirection: 'row' },
  leftCol:      { width: '36%', paddingRight: 16 },
  rightCol:     { width: '64%' },
  // Section
  section:      { marginBottom: 10 },
  sectionHead:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 0.5, borderBottomColor: '#d4d4d8', paddingBottom: 2, marginBottom: 4 },
  // Role blocks
  roleTitle:    { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  rolePeriod:   { fontSize: 8.5, fontFamily: 'Helvetica-Oblique', color: '#71717a', marginBottom: 3 },
  // Bullets
  bullet:       { flexDirection: 'row', marginBottom: 1.5 },
  bulletDot:    { width: 10, color: '#71717a' },
  bulletText:   { flex: 1 },
  // Text
  p:            { marginBottom: 3 },
  bold:         { fontFamily: 'Helvetica-Bold' },
  italic:       { fontFamily: 'Helvetica-Oblique' },
  skillLine:    { fontSize: 8.5, marginBottom: 2 },
});

// ── Inline parser (bold / italic) ─────────────────────────────────────────────
let _key = 0;
function nextKey() { return _key++; }

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(React.createElement(Text, { key: nextKey() }, text.slice(last, m.index)));
    if (m[2]) parts.push(React.createElement(Text, { key: nextKey(), style: S.bold }, m[2]));
    else if (m[3]) parts.push(React.createElement(Text, { key: nextKey(), style: S.italic }, m[3]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(React.createElement(Text, { key: nextKey() }, text.slice(last)));
  return parts;
}

// ── Section parser ────────────────────────────────────────────────────────────
type Section = { heading: string; lines: string[] };

function parseSections(markdown: string): { name: string; sections: Section[] } {
  const rawLines = markdown.split('\n');
  let name = '';
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) { name = line.slice(2).trim(); continue; }
    if (line.startsWith('---')) continue; // strip dividers
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return { name, sections };
}

// ── Column assignment ─────────────────────────────────────────────────────────
const LEFT_KEYWORDS = ['skill', 'education', 'certif', 'achievement', 'award', 'language', 'tool', 'tech stack'];

function isLeftColumn(heading: string) {
  const h = heading.toLowerCase();
  return LEFT_KEYWORDS.some(kw => h.includes(kw));
}

// ── Section renderer ──────────────────────────────────────────────────────────
function renderSection(sec: Section): React.ReactElement {
  const isSkills = sec.heading.toLowerCase().includes('skill') || sec.heading.toLowerCase().includes('tool') || sec.heading.toLowerCase().includes('tech');
  const isExperience = sec.heading.toLowerCase().includes('experience') || sec.heading.toLowerCase().includes('project');

  const children: React.ReactNode[] = [
    React.createElement(Text, { key: nextKey(), style: S.sectionHead }, sec.heading.toUpperCase()),
  ];

  if (isSkills) {
    // Collect bullet items and render as comma-separated line
    const items = sec.lines
      .filter(l => l.startsWith('- ') || l.startsWith('* '))
      .map(l => l.slice(2).trim());
    if (items.length > 0) {
      children.push(React.createElement(Text, { key: nextKey(), style: S.skillLine }, items.join(', ')));
    }
    // Any non-bullet lines as paragraphs
    sec.lines
      .filter(l => !l.startsWith('- ') && !l.startsWith('* ') && l.trim())
      .forEach(l => {
        children.push(React.createElement(Text, { key: nextKey(), style: S.p }, ...parseInline(l)));
      });
  } else if (isExperience) {
    // Group lines into role blocks: ### title → italic period → bullets
    const blocks: React.ReactElement[] = [];
    let blockChildren: React.ReactNode[] = [];
    let inBlock = false;

    const flush = () => {
      if (inBlock && blockChildren.length) {
        blocks.push(React.createElement(View, { key: nextKey(), wrap: false, style: { marginBottom: 5 } }, ...blockChildren));
        blockChildren = [];
      }
    };

    for (const line of sec.lines) {
      // Role/project title: ### heading OR **bold** line
      const boldTitleMatch = line.match(/^\*\*(.+?)\*\*(.*)/);
      if (line.startsWith('### ') || boldTitleMatch) {
        flush();
        inBlock = true;
        if (line.startsWith('### ')) {
          blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.roleTitle }, line.slice(4).trim()));
        } else if (boldTitleMatch) {
          blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.roleTitle }, boldTitleMatch[1].trim()));
          // Handle inline metadata: **Title** | *period* | extra
          const afterTitle = boldTitleMatch[2].replace(/^\s*\|\s*/, '').trim();
          if (afterTitle) {
            const italicMatch = afterTitle.match(/^\*([^*]+)\*(.*)/);
            if (italicMatch) {
              blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.rolePeriod }, italicMatch[1]));
              const rest = italicMatch[2].replace(/^\s*\|\s*/, '').trim();
              if (rest) blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.p }, ...parseInline(rest)));
            } else {
              blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.p }, ...parseInline(afterTitle)));
            }
          }
        }
      } else if (line.trim() === '') {
        // skip blank lines inside blocks
      } else if (/^\*[^*]/.test(line.trim()) && line.trim().endsWith('*')) {
        // Standalone italic period line: *Jan 2024 – Mar 2024*
        const inner = line.trim().slice(1, -1);
        blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.rolePeriod }, inner));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        blockChildren.push(
          React.createElement(View, { key: nextKey(), style: S.bullet },
            React.createElement(Text, { style: S.bulletDot }, '•'),
            React.createElement(Text, { style: S.bulletText }, ...parseInline(line.slice(2))),
          )
        );
      } else if (line.trim()) {
        blockChildren.push(React.createElement(Text, { key: nextKey(), style: S.p }, ...parseInline(line)));
      }
    }
    flush();
    children.push(...blocks);
  } else {
    // Generic: bullets + paragraphs
    for (const line of sec.lines) {
      if (!line.trim()) continue;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(
          React.createElement(View, { key: nextKey(), style: S.bullet },
            React.createElement(Text, { style: S.bulletDot }, '•'),
            React.createElement(Text, { style: S.bulletText }, ...parseInline(line.slice(2))),
          )
        );
      } else {
        children.push(React.createElement(Text, { key: nextKey(), style: S.p }, ...parseInline(line)));
      }
    }
  }

  return React.createElement(View, { key: nextKey(), style: S.section }, ...children);
}

// ── Main builder ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function markdownToPdf(markdown: string, variantName: string): React.ReactElement<any> {
  _key = 0;
  const { name, sections } = parseSections(markdown);

  const left  = sections.filter(s => isLeftColumn(s.heading)).map(renderSection);
  const right = sections.filter(s => !isLeftColumn(s.heading)).map(renderSection);

  return React.createElement(
    Document,
    null,
    React.createElement(Page, { size: 'A4', style: S.page },
      // Header
      React.createElement(View, { style: S.headerRow },
        React.createElement(Text, { style: S.name }, name || variantName),
        React.createElement(Text, { style: S.variantLabel }, variantName.toUpperCase()),
      ),
      React.createElement(View, { style: S.divider }),
      // Two-column body
      React.createElement(View, { style: S.body },
        React.createElement(View, { style: S.leftCol }, ...left),
        React.createElement(View, { style: S.rightCol }, ...right),
      ),
    ),
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  const decoded = decodeURIComponent(variant);

  const version = await getResumeVersion(decoded);
  if (!version) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  if (!version.content.trim()) return NextResponse.json({ error: 'No content to export' }, { status: 400 });

  const doc = markdownToPdf(version.content, decoded);
  const buffer = await renderToBuffer(doc);

  const slug = decoded.toLowerCase().replace(/\s+/g, '-');
  const path = `${slug}/resume-${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('resumes')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(path);
  const pdf_url = urlData.publicUrl;

  await setResumeVersionPdf(decoded, pdf_url, path);

  return NextResponse.json({ pdf_url });
}
