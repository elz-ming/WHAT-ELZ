'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus } from '@/lib/types/jobs';

const STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: 'draft',        label: 'Draft'        },
  { status: 'ready',        label: 'Ready'        },
  { status: 'submitted',    label: 'Submitted'    },
  { status: 'acknowledged', label: 'Acknowledged' },
  { status: 'interviewing', label: 'Interviewing' },
  { status: 'offered',      label: 'Offered'      },
  { status: 'rejected',     label: 'Rejected'     },
  { status: 'ghosted',      label: 'Ghosted'      },
];

interface Props {
  readonly initialApplications: Application[];
}

export function ApplicationPipeline({ initialApplications }: Props) {
  const [applications, setApplications] = useState(initialApplications);
  const [updating, setUpdating]         = useState<string | null>(null);

  async function advance(id: string, next: ApplicationStatus) {
    setUpdating(id);
    await fetch(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status: next } : a)
    );
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      {STAGES.map(({ status, label }) => {
        const apps = applications.filter(a => a.status === status);
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">{label}</span>
              <span className="text-xs text-zinc-400">({apps.length})</span>
            </div>
            {apps.length === 0 ? (
              <p className="text-xs text-zinc-300 pl-2">—</p>
            ) : (
              <div className="space-y-2">
                {apps.map(app => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between border border-zinc-200 rounded px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {app.job_listings?.company ?? 'Unknown'} — {app.job_listings?.role ?? '—'}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {app.applied_at ? `Applied ${new Date(app.applied_at).toLocaleDateString()}` : 'Not yet sent'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {status === 'ready' && (
                        <button
                          onClick={() => advance(app.id, 'submitted')}
                          disabled={updating === app.id}
                          className="text-xs px-3 py-1 rounded bg-zinc-900 text-white disabled:opacity-50"
                        >
                          {updating === app.id ? '…' : 'Mark Submitted'}
                        </button>
                      )}
                      {status === 'draft' && (
                        <button
                          onClick={() => advance(app.id, 'ready')}
                          disabled={updating === app.id}
                          className="text-xs px-3 py-1 rounded border border-zinc-300 text-zinc-700 disabled:opacity-50"
                        >
                          {updating === app.id ? '…' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
