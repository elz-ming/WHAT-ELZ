'use client';

import { useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Resume, ResumeStructured } from '@/lib/types/jobs';

interface Props {
  initialContent: string;
  updatedAt: string | null;
  initialResumes: Resume[];
  onSave: (content: string) => Promise<void>;
}

const NARRATIVES = ['AI Engineer', 'Full-Stack Engineer', 'Data Engineer', 'Technical Co-Founder'] as const;

export function ResumeEditor({ initialContent, updatedAt, initialResumes, onSave }: Props) {
  // Canonical editor state
  const [content,   setContent]   = useState(initialContent);
  const [view,      setView]      = useState<'raw' | 'preview'>('raw');
  const [saved,     setSaved]     = useState(false);
  const [pending,   startTransition] = useTransition();

  // AI draft state
  const [resumes,   setResumes]   = useState(initialResumes);
  const [narrative, setNarrative] = useState<string>('AI Engineer');
  const [drafting,  setDrafting]  = useState(false);
  const [draft,     setDraft]     = useState<ResumeStructured | null>(null);
  const [label,     setLabel]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [draftErr,  setDraftErr]  = useState<string | null>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const dirty = content !== initialContent;

  function handleSave() {
    startTransition(async () => {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleDraft() {
    setDrafting(true);
    setDraftErr(null);
    try {
      const res = await fetch('/api/admin/resume/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative }),
      });
      const data = await res.json() as { structured?: ResumeStructured; error?: string };
      if (!res.ok || !data.structured) { setDraftErr(data.error ?? 'Draft failed'); return; }
      setDraft(data.structured);
      setLabel(`${narrative} — ${new Date().toLocaleDateString()}`);
    } finally {
      setDrafting(false);
    }
  }

  function loadDraftIntoEditor() {
    if (!draft) return;
    const md = [
      `# ${label}`,
      '',
      `## Summary`,
      draft.summary,
      '',
      `## Skills`,
      draft.skills.map(s => `- ${s}`).join('\n'),
      '',
      `## Experience`,
      ...draft.experience.map(e => [
        `### ${e.company} — ${e.role}`,
        `*${e.period}*`,
        '',
        ...e.bullets.map(b => `- ${b}`),
        '',
      ]).flat(),
      `## Education`,
      ...draft.education.map(e => `- ${e.institution} — ${e.degree} (${e.period})`),
      '',
      `## Achievements`,
      ...draft.achievements.map(a => `- ${a}`),
    ].join('\n');
    setContent(md);
    setView('raw');
  }

  async function handleSaveDraft() {
    if (!draft || !label) return;
    setSaving(true);
    try {
      const raw = [
        draft.summary,
        '\nSKILLS\n' + draft.skills.join(', '),
        '\nEXPERIENCE\n' + draft.experience.map(e =>
          `${e.company} — ${e.role} (${e.period})\n` + e.bullets.map(b => `• ${b}`).join('\n')
        ).join('\n\n'),
        '\nEDUCATION\n' + draft.education.map(e => `${e.institution} — ${e.degree} (${e.period})`).join('\n'),
        '\nACHIEVEMENTS\n' + draft.achievements.join('\n'),
      ].join('\n');
      const res = await fetch('/api/admin/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, raw_text: raw, structured: draft }),
      });
      const data = await res.json() as { resume?: Resume };
      if (data.resume) { setResumes(prev => [data.resume!, ...prev]); setDraft(null); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Canonical resume editor ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Raw / Preview toggle */}
          <div className="flex border border-zinc-200 rounded overflow-hidden">
            {(['raw', 'preview'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                  view === v
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-zinc-400">{wordCount} words</span>
            {updatedAt && (
              <span className="font-mono text-xs text-zinc-400">
                Saved {new Date(updatedAt).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            {dirty && !pending && (
              <span className="font-mono text-xs text-amber-500">Unsaved</span>
            )}
            <button
              onClick={handleSave}
              disabled={pending || !dirty}
              className="border border-zinc-900 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>

        {view === 'raw' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste or write your resume in markdown…"
            spellCheck={false}
            className="w-full h-[calc(100vh-300px)] min-h-[400px] resize-none border border-zinc-200 rounded p-4 font-mono text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors leading-relaxed"
          />
        ) : (
          <div className="w-full h-[calc(100vh-300px)] min-h-[400px] overflow-y-auto border border-zinc-200 rounded p-6 prose prose-zinc prose-sm max-w-none">
            {content.trim()
              ? <ReactMarkdown>{content}</ReactMarkdown>
              : <p className="text-zinc-300 font-mono text-sm">Nothing to preview yet.</p>
            }
          </div>
        )}

        <p className="font-mono text-xs text-zinc-400">
          Synced with FUNCTION_WHATELZ —{' '}
          <code className="bg-zinc-100 px-1 rounded">get_resume</code> /{' '}
          <code className="bg-zinc-100 px-1 rounded">update_resume</code>
        </p>
      </section>

      {/* ── AI Draft Generator ── */}
      <section className="space-y-4 border-t border-zinc-100 pt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">AI Draft Generator</p>

        <div className="border border-zinc-200 rounded p-4 space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              className="border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:border-zinc-400"
            >
              {NARRATIVES.map(n => <option key={n}>{n}</option>)}
            </select>
            <button
              onClick={handleDraft}
              disabled={drafting}
              className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40"
            >
              {drafting ? 'Drafting…' : 'AI Draft'}
            </button>
          </div>
          {draftErr && <p className="text-red-500 text-sm font-mono">{draftErr}</p>}
        </div>

        {draft && (
          <div className="border border-zinc-200 rounded p-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Label e.g. AI Engineer — Apr 2026"
                className="flex-1 min-w-0 border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
              />
              <button
                onClick={loadDraftIntoEditor}
                className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                Load into editor ↑
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || !label}
                className="border border-zinc-200 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Summary</p>
                <p className="text-zinc-700">{draft.summary}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Skills</p>
                <p className="text-zinc-700">{draft.skills.join(' · ')}</p>
              </div>
              {draft.experience.map(exp => (
                <div key={exp.company}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1">
                    {exp.company} — {exp.role} ({exp.period})
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {exp.bullets.map((b, i) => <li key={i} className="text-zinc-700">{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved drafts */}
        {resumes.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Saved drafts</p>
            <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
              {resumes.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{r.label}</p>
                    <p className="text-xs text-zinc-400 font-mono">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  {r.is_active && (
                    <span className="font-mono text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded">active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
