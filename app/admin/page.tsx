import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-server';

export const metadata: Metadata = { title: 'Dashboard — whatelz.ai' };

const ALLOWED_EMAIL = 'elz.work22@gmail.com';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const user  = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? '';

  if (email !== ALLOWED_EMAIL) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Unauthorized</p>
        <p className="text-sm text-zinc-500">{email} is not allowed here.</p>
        <SignOutButton>
          <button className="mt-4 border border-zinc-300 px-4 py-2 font-mono text-xs tracking-widest uppercase text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  const [
    { count: blogCount     },
    { count: hackCount     },
    { count: careerCount   },
    { count: visitorCount  },
    { count: chatCount     },
    { data: recentVisitors },
    { data: recentChats    },
  ] = await Promise.all([
    supabaseAdmin.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('hackathons').select('*', { count: 'exact', head: true }).eq('published', true),
    supabaseAdmin.from('career').select('*', { count: 'exact', head: true }).eq('published', true),
    supabaseAdmin.from('visitors').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('chat_logs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('visitors').select('device_id, first_seen, last_seen, page_count').order('last_seen', { ascending: false }).limit(10),
    supabaseAdmin.from('chat_logs').select('id, question, page_url, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const stats = [
    { label: 'Blog posts',  value: blogCount   ?? 0, href: '/admin/blog'            },
    { label: 'Hackathons',  value: hackCount    ?? 0, href: '/admin/hackathons'       },
    { label: 'Career',      value: careerCount  ?? 0, href: '/admin/career'           },
    { label: 'Visitors',    value: visitorCount ?? 0, href: null                       },
    { label: 'Chat asked',  value: chatCount    ?? 0, href: null                       },
  ];

  return (
    <div className="max-w-4xl space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400">{email}</span>
          <SignOutButton>
            <button className="border border-zinc-300 px-3 py-1.5 font-mono text-xs tracking-widest uppercase text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Site health stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(({ label, value, href }) => {
          const inner = (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{value}</p>
            </>
          );
          return href ? (
            <a key={label} href={href} className="border border-zinc-200 rounded p-4 hover:border-zinc-400 transition-colors">
              {inner}
            </a>
          ) : (
            <div key={label} className="border border-zinc-200 rounded p-4">
              {inner}
            </div>
          );
        })}
      </div>

      {/* Chat questions */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Recent chat questions</p>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {(recentChats ?? []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-400">No questions yet — chat logs will appear here.</p>
          ) : (recentChats ?? []).map(row => (
            <div key={row.id} className="px-4 py-3">
              <p className="text-sm text-zinc-900 line-clamp-2">{row.question}</p>
              <div className="flex items-center gap-2 mt-1">
                {row.page_url && (
                  <>
                    <span className="font-mono text-xs text-zinc-400 truncate max-w-[200px]">
                      {new URL(row.page_url).pathname}
                    </span>
                    <span className="text-xs text-zinc-300">·</span>
                  </>
                )}
                <span className="text-xs text-zinc-400">
                  {new Date(row.created_at as string).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visitor log */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Visitor sessions</p>
        <div className="border border-zinc-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-2 text-left font-mono text-xs text-zinc-400 uppercase tracking-widest">Device</th>
                <th className="px-4 py-2 text-left font-mono text-xs text-zinc-400 uppercase tracking-widest">First seen</th>
                <th className="px-4 py-2 text-left font-mono text-xs text-zinc-400 uppercase tracking-widest">Last seen</th>
                <th className="px-4 py-2 text-right font-mono text-xs text-zinc-400 uppercase tracking-widest">Pages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(recentVisitors ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-zinc-400">No visitor data yet.</td>
                </tr>
              ) : (recentVisitors ?? []).map(v => (
                <tr key={v.device_id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{(v.device_id as string).slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(v.first_seen as string).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(v.last_seen as string).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-900">{v.page_count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
