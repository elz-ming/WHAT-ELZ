import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

function sign(secret: string, payload: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirect_uri         = url.searchParams.get("redirect_uri") ?? "";
  const state                = url.searchParams.get("state") ?? "";
  const code_challenge       = url.searchParams.get("code_challenge") ?? "";
  const code_challenge_method = url.searchParams.get("code_challenge_method") ?? "";
  const error                = url.searchParams.get("error");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect to Claude — whatelz.ai</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: white;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
    }
    .logo {
      font-family: monospace;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #71717a;
      margin-bottom: 1.5rem;
    }
    h1 { font-size: 1.4rem; font-weight: 600; color: #09090b; margin-bottom: 0.5rem; }
    p  { font-size: 0.875rem; color: #71717a; margin-bottom: 1.5rem; line-height: 1.5; }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: #3f3f46;
      margin-bottom: 0.5rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-family: monospace;
    }
    input[type="password"] {
      width: 100%;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: #09090b;
      outline: none;
      margin-bottom: 1rem;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus { border-color: #09090b; }
    button {
      width: 100%;
      background: #09090b;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 6px;
      padding: 0.625rem 0.75rem;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">whatelz.ai</p>
    <h1>Connect to Claude</h1>
    <p>Enter your MCP token to grant Claude access to your whatelz tools.</p>
    ${error ? `<div class="error">Invalid token — please try again.</div>` : ""}
    <form method="POST" action="/api/oauth/authorize">
      <input type="hidden" name="redirect_uri"          value="${redirect_uri}" />
      <input type="hidden" name="state"                 value="${state}" />
      <input type="hidden" name="code_challenge"        value="${code_challenge}" />
      <input type="hidden" name="code_challenge_method" value="${code_challenge_method}" />
      <label for="token">MCP Token</label>
      <input type="password" id="token" name="token" placeholder="mcp_…" required autofocus />
      <button type="submit">Authorize Claude</button>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(req: NextRequest) {
  const form                 = await req.formData();
  const token                = String(form.get("token") ?? "");
  const redirect_uri         = String(form.get("redirect_uri") ?? "");
  const state                = String(form.get("state") ?? "");
  const code_challenge       = String(form.get("code_challenge") ?? "");
  const code_challenge_method = String(form.get("code_challenge_method") ?? "");

  if (!redirect_uri) return new NextResponse("Missing redirect_uri", { status: 400 });

  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "mcp_token")
    .single();

  if (!data?.value || token !== data.value) {
    const url = new URL(req.url);
    url.searchParams.set("error", "invalid_token");
    url.searchParams.set("redirect_uri", redirect_uri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", code_challenge);
    url.searchParams.set("code_challenge_method", code_challenge_method);
    return NextResponse.redirect(url.toString());
  }

  const now     = Math.floor(Date.now() / 1000);
  const payload = `${code_challenge}.${code_challenge_method}.${now}`;
  const code    = `${Buffer.from(payload).toString("base64url")}.${sign(data.value, payload)}`;

  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect.toString());
}
