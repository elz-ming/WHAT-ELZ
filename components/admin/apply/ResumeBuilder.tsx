'use client';

import { useState } from 'react';
import type { Resume, ResumeStructured } from '@/lib/types/jobs';

interface Props {
  readonly initialResumes: Resume[];
}

const NARRATIVES = ['AI Engineer', 'Full-Stack Engineer', 'Data Engineer', 'Technical Co-Founder'] as const;

export function ResumeBuilder({ initialResumes }: Props) {
  const [resumes, setResumes]     = useState(initialResumes);
  const [narrative, setNarrative] = useState<string>('AI Engineer');
  const [drafting, setDrafting]   = useState(false);
  const [draft, setDraft]         = useState<ResumeStructured | null>(null);
  const [label, setLabel]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/resume/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative }),
      });
      const data = await res.json() as { structured?: ResumeStructured; error?: string };
      if (!res.ok || !data.structured) {
        setError(data.error ?? 'Draft failed');
        return;
      }
      setDraft(data.structured);
      setLabel(`${narrative} — ${new Date().toLocaleDateString()}`);
    } finally {
      setDrafting(false);
    }
  }

  async function handleSave() {
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
      if (data.resume) {
        setResumes(prev => [data.resume!, ...prev]);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-zinc-200 rounded p-4 space-y-4">
        <h2 className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Generate Draft</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            className="border border-zinc-300 rounded px-3 py-2 text-sm bg-white"
          >
            {NARRATIVES.map(n => <option key={n}>{n}</option>)}
          </select>
          <button
            onClick={handleDraft}
            disabled={drafting}
            className="px-4 py-2 text-sm rounded bg-zinc-900 text-white disabled:opacity-50"
          >
            {drafting ? 'Drafting…' : 'AI Draft'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {draft && (
        <div className="border border-zinc-200 rounded p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label (e.g. AI Engineer — Apr 2026)"
              className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm bg-white"
            />
            <button
              onClick={handleSave}
              disabled={saving || !label}
              className="px-4 py-2 text-sm rounded bg-zinc-900 text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Resume'}
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-mono text-xs text-zinc-400 mb-1">SUMMARY</p>
              <p className="text-zinc-700">{draft.summary}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-zinc-400 mb-1">SKILLS</p>
              <p className="text-zinc-700">{draft.skills.join(' · ')}</p>
            </div>
            {draft.experience.map(exp => (
              <div key={exp.company}>
                <p className="font-mono text-xs text-zinc-400 mb-1">
                  {exp.company} — {exp.role} ({exp.period})
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {exp.bullets.map((b, i) => (
                    <li key={i} className="text-zinc-700">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Saved Resumes</h2>
          {resumes.map(r => (
            <div key={r.id} className="flex items-center justify-between border border-zinc-200 rounded px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{r.label}</p>
                <p className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              {r.is_active && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">active</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
