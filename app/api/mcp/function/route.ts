import { NextRequest, NextResponse } from "next/server";
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/blog";
import {
  getMediaAssets,
  getMediaAsset,
  updateMediaAsset,
} from "@/lib/media";
import { supabaseAdmin } from "@/lib/supabase-server";
import { listResumeVersions, getResumeVersion, upsertResumeVersion } from "@/lib/resume-versions";

type ToolArgs = Record<string, unknown>;

const TOOLS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  // ── Blog ────────────────────────────────────────────────────────────────
  list_posts: (a) => getAllPosts((a.include_drafts as boolean | undefined) ?? false),

  get_post: (a) => getPost(a.slug as string),

  create_post: (a) =>
    createPost({
      slug:    a.slug    as string,
      title:   a.title   as string,
      content: a.content as string,
      summary: a.summary as string | undefined,
      tags:    a.tags    as string[] | undefined,
      status:  a.status  as "draft" | "published" | undefined,
    }),

  update_post: (a) =>
    updatePost(a.slug as string, {
      title:   a.title   as string | undefined,
      summary: a.summary as string | undefined,
      content: a.content as string | undefined,
      tags:    a.tags    as string[] | undefined,
      status:  a.status  as "draft" | "published" | undefined,
    }),

  delete_post: (a) => deletePost(a.slug as string),

  // ── Media ────────────────────────────────────────────────────────────────
  list_media: (a) =>
    getMediaAssets({
      destination: a.destination as string | undefined,
      processed:   typeof a.processed === "boolean" ? a.processed : undefined,
      limit:       (a.limit as number | undefined) ?? 50,
    }),

  get_media_asset: (a) => getMediaAsset(a.id as string),

  update_media_asset: (a) =>
    updateMediaAsset(a.id as string, {
      label:        a.label        as string | undefined,
      description:  a.description  as string | undefined,
      destinations: a.destinations as string[] | undefined,
      focal_point:  a.focal_point  as { x: number; y: number } | undefined,
      crop_hint:    a.crop_hint    as { x: number; y: number; width: number; height: number } | undefined,
      processed:    a.processed    as boolean | undefined,
    }),

  // ── Resume ───────────────────────────────────────────────────────────────
  get_resume: async () => {
    const { data } = await supabaseAdmin
      .from("system_config")
      .select("value, updated_at")
      .eq("key", "resume")
      .single();
    if (!data?.value) return { content: null, message: "No resume yet — use update_resume to create one." };
    return { content: data.value, updated_at: data.updated_at };
  },

  update_resume: async (a) => {
    const content = a.content as string;
    const { error } = await supabaseAdmin
      .from("system_config")
      .upsert({ key: "resume", value: content });
    if (error) throw error;
    return { ok: true };
  },

  // ── Resume versions ───────────────────────────────────────────────────────
  list_resume_versions: () => listResumeVersions(),

  get_resume_version: (a) => getResumeVersion(a.variant as string),

  update_resume_version: (a) =>
    upsertResumeVersion(a.variant as string, a.content as string),
};

const TOOL_SCHEMAS = [
  // ── Blog ─────────────────────────────────────────────────────────────────
  {
    name: "list_posts",
    description: "List blog posts. Returns slug, title, date, summary, tags, status. Published only by default.",
    inputSchema: {
      type: "object",
      properties: { include_drafts: { type: "boolean", default: false } },
    },
  },
  {
    name: "get_post",
    description: "Get a single blog post by slug, including full content.",
    inputSchema: {
      type: "object", required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "create_post",
    description: "Create a new blog post. Status defaults to 'draft'.",
    inputSchema: {
      type: "object", required: ["slug", "title", "content"],
      properties: {
        slug:    { type: "string", description: "URL-safe identifier, e.g. 'my-first-post'" },
        title:   { type: "string" },
        content: { type: "string", description: "MDX/Markdown body" },
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
      type: "object", required: ["slug"],
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
      type: "object", required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  // ── Media ─────────────────────────────────────────────────────────────────
  {
    name: "list_media",
    description: "List media assets. Filter by destination or processed status. Returns id, url, label, description, destinations, focal_point, crop_hint, processed.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", enum: ["landing", "about", "blog", "hackathon", "projects", "other"] },
        processed:   { type: "boolean", description: "Pass false to fetch only unanalysed images." },
        limit:       { type: "integer", default: 50, minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: "get_media_asset",
    description: "Get a single media asset by ID. Returns the public URL — fetch it to analyse the image with vision.",
    inputSchema: {
      type: "object", required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "update_media_asset",
    description: "Write analysis results back to a media asset. Set processed=true once done so the asset is skipped on future runs.",
    inputSchema: {
      type: "object", required: ["id"],
      properties: {
        id:          { type: "string" },
        label:       { type: "string" },
        description: { type: "string", description: "Human-readable description / alt text." },
        destinations: {
          type: "array",
          items: { type: "string", enum: ["landing", "about", "blog", "hackathon", "projects", "other"] },
        },
        focal_point: {
          type: "object",
          description: "Normalised 0–1 coordinates of the main subject centre.",
          required: ["x", "y"],
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        crop_hint: {
          type: "object",
          description: "Normalised 0–1 crop rectangle that keeps the most useful area.",
          required: ["x", "y", "width", "height"],
          properties: {
            x:      { type: "number", minimum: 0, maximum: 1 },
            y:      { type: "number", minimum: 0, maximum: 1 },
            width:  { type: "number", minimum: 0, maximum: 1 },
            height: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        processed: { type: "boolean", description: "Set true after analysis is complete." },
      },
    },
  },
  // ── Resume ────────────────────────────────────────────────────────────────
  {
    name: "get_resume",
    description: "Read the current resume. Returns the full markdown content and when it was last updated.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_resume",
    description: "Write or fully replace the resume. Always call get_resume first, edit the content, then write back the complete updated markdown. Overwrites whatever is currently stored.",
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: { type: "string", description: "Full resume in markdown format." },
      },
    },
  },
  // ── Resume versions ────────────────────────────────────────────────────────
  {
    name: "list_resume_versions",
    description: "List all named resume variants (AI Engineer, Blockchain Engineer, Software Engineer) with their content, pdf_url, and timestamps.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_resume_version",
    description: "Read the markdown content for a specific resume variant.",
    inputSchema: {
      type: "object",
      required: ["variant"],
      properties: {
        variant: {
          type: "string",
          enum: ["AI Engineer", "Blockchain Engineer", "Software Engineer"],
          description: "The named resume variant to read.",
        },
      },
    },
  },
  {
    name: "update_resume_version",
    description: "Write or replace the markdown content for a specific resume variant. Call get_resume_version first, edit, then write back the full content.",
    inputSchema: {
      type: "object",
      required: ["variant", "content"],
      properties: {
        variant: {
          type: "string",
          enum: ["AI Engineer", "Blockchain Engineer", "Software Engineer"],
        },
        content: { type: "string", description: "Full resume variant in markdown format." },
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
        jsonrpc: "2.0", id,
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
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
    },
  });
}
