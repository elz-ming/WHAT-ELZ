import { baseUrl, jsonWithCors } from "@/lib/mcp-discovery";

export async function GET(req: Request) {
  const base = baseUrl(req);
  return jsonWithCors({
    resource: `${base}/api/mcp/elzos`,
    // Shared root auth server (same as whatelz docs) — issues a bearer that
    // both MCPs accept. Keeps OAuth on the well-trodden RFC 8414 root path.
    authorization_servers: [base],
  });
}
