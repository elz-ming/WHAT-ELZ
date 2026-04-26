import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin — whatelz.ai" };

const ALLOWED_EMAIL = "elz.work22@gmail.com";

const LINKS = [
  {
    label: "Vercel",
    href: "https://vercel.com/dashboard",
    desc: "Deployments & logs",
  },
  {
    label: "Supabase",
    href: "https://supabase.com/dashboard",
    desc: "Tables & migrations",
  },
  {
    label: "GitHub",
    href: "https://github.com/elz-ming/WHAT-ELZ",
    desc: "Source repo",
  },
  {
    label: "Clerk",
    href: "https://dashboard.clerk.com",
    desc: "Auth & users",
  },
];

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  if (email !== ALLOWED_EMAIL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-100">
        <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
          Unauthorized
        </p>
        <p className="text-sm text-zinc-400">{email} is not allowed here.</p>
        <SignOutButton>
          <button className="mt-4 border border-zinc-700 px-4 py-2 font-mono text-xs tracking-widest uppercase text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100">
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  const mcpToken = process.env.MCP_TOKEN ?? "";
  const maskedToken = mcpToken
    ? `${mcpToken.slice(0, 6)}${"•".repeat(Math.max(0, mcpToken.length - 10))}${mcpToken.slice(-4)}`
    : "(not set)";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            whatelz.ai
          </span>
          <span className="font-mono text-xs text-zinc-700">/</span>
          <span
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--accent-text)" }}
          >
            admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-zinc-500">{email}</span>
          <SignOutButton>
            <button className="border border-zinc-700 px-3 py-1.5 font-mono text-xs tracking-widest uppercase text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        {/* MCP token */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            MCP Auth
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            PAT Token
          </h2>
          <div className="mt-4 flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-4 py-3">
            <code className="flex-1 font-mono text-sm text-zinc-300">
              {maskedToken}
            </code>
            <span className="font-mono text-xs text-zinc-600">MCP_TOKEN</span>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-600">
            Set as Bearer token in Claude Desktop / Claude.ai connector config.
          </p>
        </section>

        {/* External dashboards */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Dashboards
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Quick Links
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {LINKS.map(({ label, href, desc }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-zinc-800 px-4 py-3 transition-colors hover:border-zinc-600"
              >
                <div>
                  <p className="font-semibold text-zinc-100">{label}</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">
                    {desc}
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-600">↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* MCP endpoints */}
        <section>
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            MCP Endpoints
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Servers</h2>
          <div className="mt-4 space-y-2">
            {[
              {
                name: "ADMIN_WHATELZ",
                path: "/api/mcp/whatelz",
                tools: "12 tools",
              },
            ].map(({ name, path, tools }) => (
              <div
                key={path}
                className="flex items-center justify-between border border-zinc-800 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-zinc-100">{name}</p>
                  <code className="font-mono text-xs text-zinc-500">
                    {path}
                  </code>
                </div>
                <span className="font-mono text-xs text-zinc-600">{tools}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
