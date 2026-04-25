import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function sign(payload: string): string {
  const secret = process.env.MCP_TOKEN!;
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirect_uri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state") ?? "";
  const code_challenge = url.searchParams.get("code_challenge") ?? "";
  const code_challenge_method =
    url.searchParams.get("code_challenge_method") ?? "";

  if (!redirect_uri)
    return new NextResponse("Missing redirect_uri", { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const payload = `${code_challenge}.${code_challenge_method}.${now}`;
  const code = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;

  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect.toString());
}
