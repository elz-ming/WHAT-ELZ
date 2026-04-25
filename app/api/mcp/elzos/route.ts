import { NextRequest, NextResponse } from "next/server";
import {
  listDocs,
  listSections,
  readSection,
  readDoc,
  createSection,
  appendSection,
  patchSection,
  renameSection,
  moveSection,
  deleteSection,
  listRecentChanges,
  VALID_SLUGS,
  type DocSlug,
} from "@/lib/elzos-docs";

type ToolArgs = Record<string, unknown>;

const TOOL_SCHEMAS = [
  {
    name: "list_docs",
    description:
      "List the 6 ELZ OS doc slugs with their current section count and most recent updated_at.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_sections",
    description:
      "List headings, positions, versions, content previews for a doc.",
    inputSchema: {
      type: "object",
      required: ["doc_slug"],
      properties: { doc_slug: { type: "string", enum: VALID_SLUGS } },
    },
  },
  {
    name: "read_doc",
    description: "Read the entire doc as one assembled markdown blob.",
    inputSchema: {
      type: "object",
      required: ["doc_slug"],
      properties: { doc_slug: { type: "string", enum: VALID_SLUGS } },
    },
  },
  {
    name: "read_section",
    description:
      "Read a section's full content + version. Store the version for patch/rename/move/delete.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
      },
    },
  },
  {
    name: "list_recent_changes",
    description:
      "See what was edited recently across docs. Optional since (ISO datetime) and doc_slug filter.",
    inputSchema: {
      type: "object",
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        since: { type: "string", format: "date-time" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "create_section",
    description: "Create a new section. Fails on duplicate heading.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "content"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        content: { type: "string" },
        position: { type: "integer", minimum: 0 },
        author: { type: "string" },
      },
    },
  },
  {
    name: "append_section",
    description: "Append markdown to a section; creates it if missing.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "content"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        content: { type: "string" },
        create_if_missing: { type: "boolean", default: true },
        author: { type: "string" },
      },
    },
  },
  {
    name: "patch_section",
    description:
      "Replace a section's content. Requires expected_version for optimistic concurrency.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "new_content", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        new_content: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
        author: { type: "string" },
      },
    },
  },
  {
    name: "rename_section",
    description:
      "Rename a section. Requires expected_version. Fails on duplicate heading.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "old_heading", "new_heading", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        old_heading: { type: "string" },
        new_heading: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
        author: { type: "string" },
      },
    },
  },
  {
    name: "move_section",
    description:
      "Reorder a section. Insert-at-N semantics. Requires expected_version.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "new_position", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        new_position: { type: "integer", minimum: 0 },
        expected_version: { type: "integer", minimum: 1 },
        author: { type: "string" },
      },
    },
  },
  {
    name: "delete_section",
    description:
      "Soft-delete a section. Requires expected_version. Pass force=true to confirm if section content is non-empty.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
        force: { type: "boolean", default: false },
        author: { type: "string" },
      },
    },
  },
  {
    name: "describe_tools",
    description:
      "Return the full tool catalogue (same shape as tools/list, plus descriptions) for callers without MCP introspection.",
    inputSchema: { type: "object", properties: {} },
  },
];

const TOOLS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  list_docs: async () => listDocs(),
  list_sections: (a) => listSections(a.doc_slug as DocSlug),
  read_doc: (a) => readDoc(a.doc_slug as DocSlug),
  read_section: (a) => readSection(a.doc_slug as DocSlug, a.heading as string),
  list_recent_changes: (a) =>
    listRecentChanges(
      a.doc_slug as DocSlug | undefined,
      a.since as string | undefined,
      (a.limit as number | undefined) ?? 20,
    ),
  create_section: (a) =>
    createSection(
      a.doc_slug as DocSlug,
      a.heading as string,
      a.content as string,
      a.position as number | undefined,
      a.author as string | undefined,
    ),
  append_section: (a) =>
    appendSection(
      a.doc_slug as DocSlug,
      a.heading as string,
      a.content as string,
      (a.create_if_missing as boolean | undefined) ?? true,
      a.author as string | undefined,
    ),
  patch_section: (a) =>
    patchSection(
      a.doc_slug as DocSlug,
      a.heading as string,
      a.new_content as string,
      a.expected_version as number,
      a.author as string | undefined,
    ),
  rename_section: (a) =>
    renameSection(
      a.doc_slug as DocSlug,
      a.old_heading as string,
      a.new_heading as string,
      a.expected_version as number,
      a.author as string | undefined,
    ),
  move_section: (a) =>
    moveSection(
      a.doc_slug as DocSlug,
      a.heading as string,
      a.new_position as number,
      a.expected_version as number,
      a.author as string | undefined,
    ),
  delete_section: (a) =>
    deleteSection(
      a.doc_slug as DocSlug,
      a.heading as string,
      a.expected_version as number,
      (a.force as boolean | undefined) ?? false,
      a.author as string | undefined,
    ),
  describe_tools: async () => ({ tools: TOOL_SCHEMAS }),
};

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  // Both MCPs (whatelz docs + elzos) accept the same bearer so Claude Desktop's
  // OAuth flow can ride the existing root /.well-known/* + /api/oauth/*
  // discovery. ELZOS_MCP_TOKEN is kept as an alias for direct-bearer callers.
  const expected = process.env.WEBSITE_MCP_TOKEN ?? process.env.ELZOS_MCP_TOKEN;
  const elzosAlias = process.env.ELZOS_MCP_TOKEN;
  const accepted =
    !!expected &&
    (token === expected || (elzosAlias != null && token === elzosAlias));
  if (!accepted) {
    const url = new URL(req.url);
    const resourceMetadata = `${url.protocol}//${url.host}/api/mcp/elzos/.well-known/oauth-protected-resource`;
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" } },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer realm="elzos-mcp", resource_metadata="${resourceMetadata}"`,
        },
      },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authFail = checkAuth(req);
  if (authFail) return authFail;

  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid Request" },
      },
      { status: 400 },
    );
  }

  const { id, method, params } = body;

  try {
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "elzos-docs", version: "1.0.0" },
        },
      });
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOL_SCHEMAS },
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;
      const handler = TOOLS[name];
      if (!handler) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool not found: ${name}` },
        });
      }
      const result = await handler(args ?? {});
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Mcp-Session-Id",
    },
  });
}
