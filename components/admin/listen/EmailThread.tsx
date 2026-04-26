'use client';

import { useState } from 'react';

interface Email {
  id: string;
  from_address: string;
  subject: string;
  body_text: string;
  direction: 'inbound' | 'outbound';
  received_at: string;
  is_flagged: boolean;
  applications?: { id: string; status: string; job_listings?: { company: string; role: string } | null } | null;
}

interface Props { readonly emails: Email[] }

export function EmailThread({ emails }: Props) {
  const [selected, setSelected] = useState<Email | null>(null);

  const flagged   = emails.filter(e => e.is_flagged);
  const unflagged = emails.filter(e => !e.is_flagged);

  function EmailRow({ e }: { e: Email }) {
    const company = e.applications?.job_listings?.company;
    return (
      <button
        onClick={() => setSelected(e)}
        className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 ${
          selected?.id === e.id ? 'bg-zinc-50' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {e.direction === 'inbound' ? e.from_address.split('<')[0].trim() : 'You'}
              {company && <span className="text-zinc-400 font-normal ml-1">· {company}</span>}
            </p>
            <p className="text-xs text-zinc-500 truncate">{e.subject}</p>
          </div>
          <p className="text-xs text-zinc-400 shrink-0">{new Date(e.received_at).toLocaleDateString()}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-[600px] border border-zinc-200 rounded overflow-hidden">
      <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200">
        {flagged.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest px-4 py-2 bg-zinc-50">
              Flagged ({flagged.length})
            </p>
            {flagged.map(e => <EmailRow key={e.id} e={e} />)}
          </div>
        )}
        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest px-4 py-2 bg-zinc-50">
          All ({unflagged.length})
        </p>
        {unflagged.map(e => <EmailRow key={e.id} e={e} />)}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium text-zinc-900">{selected.subject}</p>
              <p className="text-sm text-zinc-500">
                From: {selected.from_address} · {new Date(selected.received_at).toLocaleString()}
              </p>
              {selected.applications && (
                <p className="text-xs text-zinc-400 mt-1">
                  Linked: {selected.applications.job_listings?.company} — {selected.applications.job_listings?.role}
                  ({selected.applications.status})
                </p>
              )}
            </div>
            <div className="text-sm text-zinc-700 whitespace-pre-wrap border-t border-zinc-100 pt-4">
              {selected.body_text || '(No text body)'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Select an email to read.</p>
        )}
      </div>
    </div>
  );
}
