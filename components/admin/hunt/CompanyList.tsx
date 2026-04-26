'use client';

import { useState } from 'react';
import type { Company } from '@/lib/types/jobs';

interface Props { readonly initialCompanies: Company[] }

const ATS_TYPES = ['greenhouse', 'lever', 'ashby', 'workable', 'linkedin', 'other'] as const;
const PRIORITIES = [1, 2, 3, 4, 5] as const;

export function CompanyList({ initialCompanies }: Props) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [adding,    setAdding]    = useState(false);
  const [form,      setForm]      = useState({ name: '', ats_type: 'greenhouse', ats_slug: '', priority: 3 });
  const [saving,    setSaving]    = useState(false);

  async function handleAdd() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json() as { company?: Company };
    if (data.company) {
      setCompanies(prev => [...prev, data.company!].sort((a, b) => a.priority - b.priority));
      setAdding(false);
      setForm({ name: '', ats_type: 'greenhouse', ats_slug: '', priority: 3 });
    }
    setSaving(false);
  }

  async function toggleStatus(id: string, current: Company['status']) {
    const next = current === 'active' ? 'paused' : 'active';
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: next } : c));
  }

  const inputCls = "border border-zinc-300 rounded px-2 py-1 text-sm bg-white";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{companies.length} companies on watchlist</p>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-sm px-3 py-1.5 rounded bg-zinc-900 text-white"
        >
          + Add company
        </button>
      </div>

      {adding && (
        <div className="border border-zinc-200 rounded p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Company name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`${inputCls} col-span-2`} />
            <select value={form.ats_type}
              onChange={e => setForm(f => ({ ...f, ats_type: e.target.value }))}
              className={inputCls}>
              {ATS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="ATS slug (e.g. stripe)" value={form.ats_slug}
              onChange={e => setForm(f => ({ ...f, ats_slug: e.target.value }))}
              className={inputCls} />
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
              className={inputCls}>
              {PRIORITIES.map(p => <option key={p} value={p}>Priority {p}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.name}
            className="text-sm px-4 py-2 rounded bg-zinc-900 text-white disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {companies.map(c => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">{c.name}</p>
              <p className="text-xs text-zinc-400">
                {c.industry ?? '—'} · {c.ats_type ?? 'no ATS'}{c.ats_slug ? ` / ${c.ats_slug}` : ''} · P{c.priority}
              </p>
            </div>
            <button onClick={() => toggleStatus(c.id, c.status)}
              className={`text-xs px-2 py-1 rounded ${
                c.status === 'active' ? 'bg-zinc-100 text-zinc-600' : 'text-zinc-400'
              }`}>
              {c.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
