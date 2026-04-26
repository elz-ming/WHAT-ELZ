'use client';

import { useState } from 'react';
import type { JobListing } from '@/lib/types/jobs';

interface Props { readonly initialListings: JobListing[] }

export function JobFeed({ initialListings }: Props) {
  const [listings, setListings] = useState(initialListings);
  const [acting,   setActing]   = useState<string | null>(null);

  async function act(id: string, status: 'shortlisted' | 'rejected_by_user') {
    setActing(id);
    await fetch(`/api/admin/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setListings(prev => prev.filter(l => l.id !== id));
    setActing(null);
  }

  if (listings.length === 0) {
    return <p className="text-sm text-zinc-400">No new listings. Discovery runs 3× daily.</p>;
  }

  return (
    <div className="space-y-3">
      {listings.map(l => (
        <div key={l.id} className="border border-zinc-200 rounded p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {l.company} — {l.role}
              </p>
              <p className="text-xs text-zinc-400">
                {l.location ?? 'Unknown location'} · {l.remote_type ?? 'onsite'}
                {l.match_score !== null && ` · Score: ${Math.round(l.match_score * 100)}%`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => act(l.id, 'shortlisted')}
                disabled={acting === l.id}
                className="text-xs px-3 py-1 rounded bg-zinc-900 text-white disabled:opacity-50"
              >
                Shortlist
              </button>
              <button
                onClick={() => act(l.id, 'rejected_by_user')}
                disabled={acting === l.id}
                className="text-xs px-3 py-1 rounded border border-zinc-200 text-zinc-400 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
          {l.score_reasoning && (
            <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-2">
              {l.score_reasoning}
            </p>
          )}
          {l.external_url && (
            <a href={l.external_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600">
              View listing →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
