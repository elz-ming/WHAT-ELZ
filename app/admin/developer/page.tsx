import type { Metadata } from 'next';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-server';
import { PATTokenCard } from './_components/PATTokenCard';

export const metadata: Metadata = { title: 'Developer — whatelz.ai' };

const LINKS = [
  { label: 'Vercel',   href: 'https://vercel.com/dashboard',          desc: 'Deployments & logs'  },
  { label: 'Supabase', href: 'https://supabase.com/dashboard',        desc: 'Tables & migrations' },
  { label: 'GitHub',   href: 'https://github.com/elz-ming/WHAT-ELZ',  desc: 'Source repo'         },
  { label: 'Clerk',    href: 'https://dashboard.clerk.com',            desc: 'Auth & users'        },
  { label: 'Inngest',  href: 'https://app.inngest.com',                desc: 'Functions & crons'   },
];

const MCP_SERVERS = [
  { name: 'ADMIN_WHATELZ',    path: '/api/mcp/whatelz',  tools: '12 tools — doc CRUD'  },
  { name: 'FUNCTION_WHATELZ', path: '/api/mcp/function', tools: '5 tools — blog write' },
];

function generateToken(): string {
  return 'mcp_' + crypto.randomBytes(24).toString('hex');
}

function maskToken(token: string): string {
  if (token.length <= 10) return '•'.repeat(token.length);
  return `${token.slice(0, 8)}${'•'.repeat(token.length - 12)}${token.slice(-4)}`;
}

async function getOrCreateToken(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'mcp_token')
    .single();

  if (data?.value) return data.value as string;

  const token = generateToken();
  await supabaseAdmin
    .from('system_config')
    .upsert({ key: 'mcp_token', value: token });
  return token;
}

async function rotateToken(): Promise<void> {
  'use server';
  const token = generateToken();
  await supabaseAdmin
    .from('system_config')
    .upsert({ key: 'mcp_token', value: token });
  revalidatePath('/admin/developer');
}

export default async function DeveloperPage() {
  const token  = await getOrCreateToken();
  const masked = maskToken(token);

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Developer</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Tooling</h1>
      </div>

      {/* PAT Token */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">MCP Auth</p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">PAT Token</h2>
        <PATTokenCard masked={masked} rotateAction={rotateToken} />
      </section>

      {/* MCP Servers */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">MCP Endpoints</p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Servers</h2>
        <div className="space-y-2">
          {MCP_SERVERS.map(({ name, path, tools }) => (
            <div key={path} className="flex items-center justify-between border border-zinc-200 px-4 py-3">
              <div>
                <p className="font-semibold text-zinc-900">{name}</p>
                <code className="font-mono text-xs text-zinc-400">{path}</code>
              </div>
              <span className="font-mono text-xs text-zinc-400">{tools}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Dashboards</p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LINKS.map(({ label, href, desc }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-400"
            >
              <div>
                <p className="font-semibold text-zinc-900">{label}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{desc}</p>
              </div>
              <span className="font-mono text-xs text-zinc-400">↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
