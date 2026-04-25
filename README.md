# whatelz.ai

Personal site of Edmund Lin Zhenming &mdash; AI Engineer.

## Stack

- Next.js 16 (App Router) &middot; React 19 &middot; TypeScript (strict)
- Tailwind CSS v4
- next-themes (manual light/dark toggle)
- Supabase (server-side client wired for future use)
- Hosted on Vercel

## Development

```bash
npm install
npm run dev      # http://localhost:3100
npm run build
npm run start
npm run lint
npm run format   # prettier write
```

## Deploys

- **uat** branch &rarr; auto-deploys to <https://whatelz-uat.vercel.app>
- **main** branch &rarr; production (currently dormant)

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase values. The
example file lists the required variables.

## Layout

```
app/         Next.js routes (App Router)
components/  Shared UI (header, footer, theme toggle, ui/ primitives)
content/     Long-form content (mdx etc., to be added)
lib/         Utilities, server clients
public/      Static assets
supabase/    SQL migrations + seed
```
