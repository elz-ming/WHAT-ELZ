import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin — whatelz.ai" };

const ALLOWED_EMAIL = "elz.work22@gmail.com";

const LINKS = [
  { label: "Vercel",   href: "https://vercel.com/dashboard",    desc: "Deployments & logs" },
  { label: "Supabase", href: "https://supabase.com/dashboard",  desc: "Tables & migrations" },
  { label: "GitHub",   href: "https://github.com/elz-ming/WHAT-ELZ", desc: "Source repo" },
  { label: "Clerk",    href: "https://dashboard.clerk.com",     desc: "Auth & users" },
];

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user  = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

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

  const mcpToken    = process.env.MCP_TOKEN ?? "";
  const maskedToken = mcpToken
    ? `${mcpToken.slice(0, 6)}${"•".repeat(Math.max(0, mcpToken.length - 10))}${mcpToken.slice(-4)}`
    : "(not set)";

  return (
    <div className="space-y-10">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest text-zinc-400 uppercase">whatelz.ai</span>
          <span className="font-mono text-xs text-zinc-300">/</span>
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--accent-text)" }}>
            admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-zinc-400">{email}</span>
          <SignOutButton>
            <button className="border border-zinc-300 px-3 py-1.5 font-mono text-xs tracking-widest uppercase text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>

      <div className="max-w-4xl space-y-12">
        {/* MCP token */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">MCP Auth</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">PAT Token</h2>
          <div className="mt-4 flex items-center gap-3 rounded border border-zinc-200 bg-zinc-50 px-4 py-3">
            <code className="flex-1 font-mono text-sm text-zinc-700">{maskedToken}</code>
            <span className="font-mono text-xs text-zinc-400">MCP_TOKEN</span>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-400">
            Set as Bearer token in Claude Desktop / Claude.ai connector config.
          </p>
        </section>

        {/* External dashboards */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Dashboards</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">Quick Links</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

        {/* MCP endpoints */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">MCP Endpoints</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">Servers</h2>
          <div className="mt-4 space-y-2">
            {[{ name: "ADMIN_WHATELZ", path: "/api/mcp/whatelz", tools: "12 tools" }].map(
              ({ name, path, tools }) => (
                <div key={path} className="flex items-center justify-between border border-zinc-200 px-4 py-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{name}</p>
                    <code className="font-mono text-xs text-zinc-400">{path}</code>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">{tools}</span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
