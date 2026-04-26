import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Developer — whatelz.ai' };

const LINKS = [
  { label: 'Vercel',   href: 'https://vercel.com/dashboard',          desc: 'Deployments & logs'  },
  { label: 'Supabase', href: 'https://supabase.com/dashboard',        desc: 'Tables & migrations' },
  { label: 'GitHub',   href: 'https://github.com/elz-ming/WHAT-ELZ',  desc: 'Source repo'         },
  { label: 'Clerk',    href: 'https://dashboard.clerk.com',            desc: 'Auth & users'        },
  { label: 'Inngest',  href: 'https://app.inngest.com',                desc: 'Functions & crons'   },
];

const MCP_SERVERS = [
  { name: 'ADMIN_WHATELZ', path: '/api/mcp/whatelz', tools: '12 tools' },
];

export default function DeveloperPage() {
  const mcpToken    = process.env.MCP_TOKEN ?? '';
  const maskedToken = mcpToken
    ? `${mcpToken.slice(0, 6)}${'•'.repeat(Math.max(0, mcpToken.length - 10))}${mcpToken.slice(-4)}`
    : '(not set)';

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
        <div className="flex items-center gap-3 rounded border border-zinc-200 bg-zinc-50 px-4 py-3">
          <code className="flex-1 font-mono text-sm text-zinc-700">{maskedToken}</code>
          <span className="font-mono text-xs text-zinc-400">MCP_TOKEN</span>
        </div>
        <p className="font-mono text-xs text-zinc-400">
          Set as Bearer token in Claude Desktop / Claude.ai connector config.
        </p>
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
