import { baseUrl, jsonWithCors } from "@/lib/mcp-discovery";

export async function GET(req: Request) {
  const base = baseUrl(req);
  return jsonWithCors({
    mcp_endpoint: `${base}/api/mcp/whatelz`,
    authorization_servers: [base],
  });
}
