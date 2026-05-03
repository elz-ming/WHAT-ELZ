create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  status text check (status in ('active', 'shipped', 'archived')),
  type text,
  tech_stack text[],
  metrics jsonb,
  external_url text,
  github_url text,
  demo_url text,
  cover_image_url text,
  content text,
  published boolean not null default false,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Public read published projects" on projects for select using (published = true);
create policy "Service role full access" on projects using (true) with check (true);

insert into projects (slug, name, tagline, description, status, type, tech_stack, metrics, external_url, published, sort_order) values
('atlas', 'Atlas', 'AI-assisted retail trading platform',
 'Multi-agent platform with a configurable execution authority slider — the user picks whether AI advises or auto-executes. Same LangGraph pipeline runs either way. Solo build, academic capstone.',
 'active', 'saas',
 array['Next.js 16','LangGraph.js','Gemini 2.5 Flash','Inngest','Supabase','MongoDB Atlas','Clerk','Alpaca'],
 '[{"label":"API routes","value":"27+"},{"label":"Agent graph","value":"9 nodes"},{"label":"Inngest functions","value":"7"},{"label":"Databases","value":"Supabase + Mongo"}]'::jsonb,
 'https://atlas-broker-uat.vercel.app', true, 1),
('doublelead', 'Double Lead', 'Operator workflow platform',
 'Workflow backbone for solo revenue operators. Owns the chain end-to-end: stranger → lead → customer → payment. MCP-native from day one. 5-person team, architect and primary developer.',
 'shipped', 'saas',
 array['Next.js 16','Supabase','Inngest','Clerk','Stripe','Groq','Gemini','Meta Cloud API'],
 '[{"label":"API routes","value":"115+"},{"label":"Background crons","value":"11"},{"label":"Tests","value":"295 unit / 24 E2E"},{"label":"MCP tools","value":"43 across 5 servers"}]'::jsonb,
 'https://doublelead.vercel.app', true, 2),
('whatelz', 'whatelz.ai', 'Personal OS and AI-native portfolio',
 'The site you''re on. A shell-first portfolio built as a working system: MCP servers, Inngest background jobs, Supabase data layer, and a Groq-powered AI assistant baked into the layout.',
 'active', 'personal',
 array['Next.js 16','Supabase','Inngest','Groq','Tailwind CSS','MCP','Vercel'],
 '[{"label":"MCP servers","value":"2"},{"label":"Inngest functions","value":"4+"},{"label":"API routes","value":"20+"},{"label":"Shell components","value":"5"}]'::jsonb,
 'https://whatelz.ai', true, 3);
