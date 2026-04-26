# BRAND.md — whatelz.ai

A reference for anyone (human or agent) writing UI for this project.

---

## Voice

Minimal. Technical. Direct. No exclamation marks, no hype, no filler copy.
Labels and categories in `ALLCAPS MONO`. Body copy in sentence case.

---

## Color

| Token              | Value       | Use                                        |
| ------------------ | ----------- | ------------------------------------------ |
| `--background`     | `#ffffff`   | Page background — always white             |
| `--foreground`     | `#171717`   | Body text                                  |
| `--accent`         | `#facc15`   | Highlight fill (hover states, badges)      |
| `--accent-text`    | `#f59e0b`   | Accent text (amber, not yellow — readable) |

**Zinc scale for UI chrome:**

| Use case             | Class            |
| -------------------- | ---------------- |
| Borders              | `border-zinc-200` |
| Subtle backgrounds   | `bg-zinc-50`     |
| Muted / meta text    | `text-zinc-400`  |
| Secondary body text  | `text-zinc-500`  |
| Primary body text    | `text-zinc-700`  |
| Headings / labels    | `text-zinc-900`  |
| Primary buttons      | `bg-zinc-900 text-white` |
| Input backgrounds    | `bg-white border-zinc-300` |
| Active nav item      | `bg-zinc-900 text-white` |
| Inactive nav item    | `text-zinc-600 hover:text-zinc-900` |

---

## Dark mode

**Not used.** Do not add `dark:` Tailwind variants anywhere.
The site is light-only. The `globals.css` `.dark {}` block exists for legacy reasons — ignore it.

---

## Typography

| Role              | Class                                           |
| ----------------- | ----------------------------------------------- |
| Page heading (H1) | `text-2xl font-semibold tracking-tight text-zinc-900` |
| Section heading   | `text-xl font-semibold tracking-tight text-zinc-900`  |
| Label / eyebrow   | `font-mono text-xs uppercase tracking-widest text-zinc-400` |
| Body              | `text-sm text-zinc-700`                         |
| Meta / timestamp  | `text-xs text-zinc-400`                         |
| Code / token      | `font-mono text-sm text-zinc-700`               |

Fonts: **Geist Sans** (body) · **Geist Mono** (labels, code, eyebrows)

---

## Components

### Buttons

```tsx
// Primary
<button className="px-4 py-2 text-sm rounded bg-zinc-900 text-white disabled:opacity-50">
// Secondary / outline
<button className="px-4 py-2 text-sm rounded border border-zinc-300 text-zinc-700 hover:border-zinc-900">
// Destructive / muted
<button className="px-4 py-2 text-sm rounded border border-zinc-200 text-zinc-400">
```

### Cards / panels

```tsx
<div className="border border-zinc-200 rounded p-4">
```

### Inputs / selects

```tsx
<input className="border border-zinc-300 rounded px-3 py-2 text-sm bg-white" />
<select className="border border-zinc-300 rounded px-3 py-2 text-sm bg-white" />
```

### Dividers

```tsx
<div className="divide-y divide-zinc-100">
```

### Accent usage

Accent is used sparingly — only for interactive highlights and branded moments (e.g. the `/admin` eyebrow label).

```tsx
<span style={{ color: "var(--accent-text)" }}>admin</span>
// or
<div className="hover:bg-[var(--accent)]">
```

---

## Layout

- Admin section: `flex min-h-screen` — fixed left sidebar (`w-48`) + `flex-1 p-6` main area.
- Max content width: `max-w-3xl` for forms/lists, `max-w-4xl` for dashboards, `max-w-5xl` for two-pane views.
- Spacing rhythm: `space-y-6` between sections, `space-y-2` within a list, `gap-3` for inline controls.

---

## Anti-patterns

- No dark mode classes (`dark:*`)
- No hardcoded dark backgrounds (`bg-zinc-950`, `bg-zinc-900` on page wrappers)
- No emojis in UI copy
- No exclamation marks in copy
- No `min-h-screen` on page components (the layout handles it)
