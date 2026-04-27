import Link from 'next/link';
import { PLATFORMS } from './_data/leads';

export default function InboxPage() {
  const allLeads = PLATFORMS.flatMap(p => p.leads.map(l => ({ ...l, platform: p })));
  const totalUnread = allLeads.reduce((n, l) => n + l.unread, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">All Channels</h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">
            {allLeads.length} leads across {PLATFORMS.length} channels
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="text-xs font-semibold text-white bg-zinc-900 rounded-full px-2 py-0.5">
            {totalUnread} unread
          </span>
        )}
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 px-4 py-2.5 w-1/3">Lead</th>
              <th className="text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 px-4 py-2.5 w-28">Channel</th>
              <th className="text-left font-mono text-[10px] uppercase tracking-widest text-zinc-400 px-4 py-2.5">Last message</th>
              <th className="text-right font-mono text-[10px] uppercase tracking-widest text-zinc-400 px-4 py-2.5 w-24">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allLeads.map(lead => (
              <tr key={lead.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: lead.platform.accent }}
                    >
                      {lead.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900">{lead.name}</p>
                        {lead.unread > 0 && (
                          <span
                            className="w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                            style={{ backgroundColor: lead.platform.accent }}
                          >
                            {lead.unread}
                          </span>
                        )}
                      </div>
                      {lead.company && <p className="text-xs text-zinc-400">{lead.company}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/inbox/${lead.platform.id}`}
                    className="inline-flex text-xs font-medium px-2 py-1 rounded-full transition-opacity hover:opacity-75"
                    style={{
                      color: lead.platform.accent,
                      backgroundColor: lead.platform.accent + '18',
                    }}
                  >
                    {lead.platform.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-500 truncate max-w-xs">{lead.lastMessage}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400 whitespace-nowrap">
                  {lead.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
