import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function sign(payload: string): string {
  const secret = process.env.WEBSITE_MCP_TOKEN!;
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
}

function s256(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = String(form.get("code") ?? "");
  const code_verifier = String(form.get("code_verifier") ?? "");

  const [payloadB64, sig] = code.split(".");
  if (!payloadB64 || !sig)
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });

  const payload = Buffer.from(payloadB64, "base64url").toString();
  if (sign(payload) !== sig)
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });

  const [challenge, method, issuedAt] = payload.split(".");
  if (Number(issuedAt) < Math.floor(Date.now() / 1000) - 600) {
    return NextResponse.json(
      { error: "invalid_grant", reason: "expired" },
      { status: 400 },
    );
  }
  if (method !== "S256" || s256(code_verifier) !== challenge) {
    return NextResponse.json(
      { error: "invalid_grant", reason: "pkce_mismatch" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      access_token: process.env.WEBSITE_MCP_TOKEN!,
      token_type: "Bearer",
      expires_in: 3600 * 24 * 30,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
