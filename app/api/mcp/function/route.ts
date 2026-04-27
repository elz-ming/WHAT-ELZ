import { NextRequest, NextResponse } from "next/server";
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/blog";
import { supabaseAdmin } from "@/lib/supabase-server";

type ToolArgs = Record<string, unknown>;

const TOOLS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  list_posts: (a) => getAllPosts((a.include_drafts as boolean | undefined) ?? false),

  get_post: (a) => getPost(a.slug as string),

  create_post: (a) =>
    createPost({
      slug:    a.slug    as string,
      title:   a.title   as string,
      content: a.content as string,
      summary: a.summary as string | undefined,
      tags:    a.tags    as string[] | undefined,
      status:  a.status  as 'draft' | 'published' | undefined,
    }),

  update_post: (a) =>
    updatePost(a.slug as string, {
      title:   a.title   as string | undefined,
      summary: a.summary as string | undefined,
      content: a.content as string | undefined,
      tags:    a.tags    as string[] | undefined,
      status:  a.status  as 'draft' | 'published' | undefined,
    }),

  delete_post: (a) => deletePost(a.slug as string),
};

const TOOL_SCHEMAS = [
  {
    name: "list_posts",
    description: "List blog posts. Returns slug, title, date, summary, tags, status. Published only by default.",
    inputSchema: {
      type: "object",
      properties: {
        include_drafts: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "get_post",
    description: "Get a single blog post by slug, including full content.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string" },
      },
    },
  },
  {
    name: "create_post",
    description: "Create a new blog post. Status defaults to 'draft'. Set status='published' to make it live immediately.",
    inputSchema: {
      type: "object",
      required: ["slug", "title", "content"],
      properties: {
        slug:    { type: "string", description: "URL-safe identifier, e.g. 'my-first-post'" },
        title:   { type: "string" },
        content: { type: "string", description: "MDX/Markdown body content" },
        summary: { type: "string" },
        tags:    { type: "array", items: { type: "string" } },
        status:  { type: "string", enum: ["draft", "published"] },
      },
    },
  },
  {
    name: "update_post",
    description: "Update an existing blog post by slug. Only provided fields are changed.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug:    { type: "string" },
        title:   { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        tags:    { type: "array", items: { type: "string" } },
        status:  { type: "string", enum: ["draft", "published"] },
      },
    },
  },
  {
    name: "delete_post",
    description: "Permanently delete a blog post by slug.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string" },
      },
    },
  },
];

async function checkAuth(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "mcp_token")
    .single();
  if (!data?.value || token !== data.value) {
    const url = new URL(req.url);
    const resourceMetadata = `${url.protocol}//${url.host}/api/mcp/function/.well-known/oauth-protected-resource`;
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" } },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer realm="whatelz-function-mcp", resource_metadata="${resourceMetadata}"`,
        },
      },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authFail = await checkAuth(req);
  if (authFail) return authFail;

  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32600, message: "Invalid Request" } },
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
          serverInfo: { name: "whatelz-function", version: "1.0.0" },
        },
      });
    }

    if (method === "tools/list") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOL_SCHEMAS } });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;
      const handler = TOOLS[name];
      if (!handler) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          error: { code: -32601, message: `Tool not found: ${name}` },
        });
      }
      const result = await handler(args ?? {});
      return NextResponse.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0", id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32603, message } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
    },
  });
}
