import type { Project } from "./types";

export const projects: Project[] = [
  {
    slug: "atlas",
    name: "Atlas",
    tagline: "AI-assisted retail trading platform",
    status: "active",
    description:
      "Multi-agent platform with a configurable execution authority slider — the user picks whether AI advises or auto-executes. Same LangGraph pipeline runs either way. Solo build, academic capstone.",
    metrics: [
      { label: "API routes", value: "27+" },
      { label: "Agent graph", value: "9 nodes" },
      { label: "Inngest functions", value: "7" },
      { label: "Databases", value: "Supabase + Mongo" },
    ],
    stack: [
      "Next.js 16",
      "LangGraph.js",
      "Gemini 2.5 Flash",
      "Inngest",
      "Supabase",
      "MongoDB Atlas",
      "Clerk",
      "Alpaca",
    ],
    url: "https://atlas-broker-uat.vercel.app",
  },
  {
    slug: "double-lead",
    name: "Double Lead",
    tagline: "Operator workflow platform",
    status: "shipped",
    description:
      "Workflow backbone for solo revenue operators. Owns the chain end-to-end: stranger → lead → customer → payment. MCP-native from day one. 5-person team, architect and primary developer.",
    metrics: [
      { label: "API routes", value: "115+" },
      { label: "Background crons", value: "11" },
      { label: "Tests", value: "295 unit / 24 E2E" },
      { label: "MCP tools", value: "43 across 5 servers" },
    ],
    stack: [
      "Next.js 16",
      "Supabase",
      "Inngest",
      "Clerk",
      "Stripe",
      "Groq",
      "Gemini",
      "Meta Cloud API",
    ],
    url: "https://doublelead.vercel.app",
  },
];

// Reserved slot — when ELZ OS work begins, populate this and it renders.
export const elzOs: Project | null = null;
