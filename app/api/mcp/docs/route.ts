import { NextRequest, NextResponse } from "next/server";
import {
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
} from "@/lib/website-docs";

type ToolArgs = Record<string, unknown>;

const TOOLS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  list_sections: (a) =>
    listSections(a.doc_slug as (typeof VALID_SLUGS)[number]),
  read_section: (a) =>
    readSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
    ),
  read_doc: (a) => readDoc(a.doc_slug as (typeof VALID_SLUGS)[number]),
  create_section: (a) =>
    createSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.content as string,
      a.position as number | undefined,
    ),
  append_section: (a) =>
    appendSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.content as string,
      (a.create_if_missing as boolean | undefined) ?? true,
    ),
  patch_section: (a) =>
    patchSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.content as string,
      a.expected_version as number,
      a.captured_by as string | undefined,
    ),
  rename_section: (a) =>
    renameSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.new_heading as string,
      a.expected_version as number,
    ),
  move_section: (a) =>
    moveSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.new_position as number,
      a.expected_version as number,
    ),
  delete_section: (a) =>
    deleteSection(
      a.doc_slug as (typeof VALID_SLUGS)[number],
      a.heading as string,
      a.expected_version as number,
    ),
  list_recent_changes: (a) =>
    listRecentChanges(
      a.doc_slug as (typeof VALID_SLUGS)[number] | undefined,
      (a.limit as number | undefined) ?? 20,
    ),
};

const TOOL_SCHEMAS = [
  {
    name: "list_sections",
    description:
      "List headings, positions, versions, content previews for a doc",
    inputSchema: {
      type: "object",
      required: ["doc_slug"],
      properties: { doc_slug: { type: "string", enum: VALID_SLUGS } },
    },
  },
  {
    name: "read_section",
    description:
      "Read a section's full content + version. Store the version for patch_section.",
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
    name: "read_doc",
    description: "Read the entire doc as one assembled markdown blob",
    inputSchema: {
      type: "object",
      required: ["doc_slug"],
      properties: { doc_slug: { type: "string", enum: VALID_SLUGS } },
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
      },
    },
  },
  {
    name: "patch_section",
    description: "Replace a section's content. Requires expected_version.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "content", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        content: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "rename_section",
    description:
      "Rename a section. Requires expected_version. Fails on duplicate heading.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "new_heading", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        new_heading: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
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
      },
    },
  },
  {
    name: "delete_section",
    description:
      "Soft-delete a section. Row + history preserved. Requires expected_version.",
    inputSchema: {
      type: "object",
      required: ["doc_slug", "heading", "expected_version"],
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        heading: { type: "string" },
        expected_version: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "list_recent_changes",
    description: "See what was edited recently across all docs.",
    inputSchema: {
      type: "object",
      properties: {
        doc_slug: { type: "string", enum: VALID_SLUGS },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
];

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.MCP_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" } },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="website-mcp"' },
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
          serverInfo: { name: "website-docs", version: "1.0.0" },
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
      const result = await handler(args);
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
