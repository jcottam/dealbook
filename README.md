# Media Utils

A growing set of tools to package and prepare content for social media and production. Built with Next.js on Vercel; domain: [media-utils.com](https://media-utils.com).

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router. Each tool is a route at `/<slug>` (`app/<slug>/page.tsx`); API routes under `app/api/` |
| `components/` | Shared UI (ShadCN in `components/ui/`) and per-tool components (`components/<slug>/`) |
| `lib/` | Shared logic. `lib/tools.ts` is the tool registry; `lib/media/` holds ffmpeg, Sandbox, and transcription helpers |
| `scripts/` | CLI helpers (`try:*`, `sandbox:snapshot`) |
| `workspaces/<name>/` | Content and tooling for one show or client. Currently `workspaces/dealbook/` |

### Adding a tool

1. Add an entry to `lib/tools.ts` (slug, title, description, icon). It shows up in the sidebar and dashboard.
2. Create `app/<slug>/page.tsx` and put its components in `components/<slug>/`.
3. Put any server routes under `app/api/`.

### DealBook workspace

| Path | Purpose |
|------|---------|
| `workspaces/dealbook/source/` | Content calendar CSV, research HTML, sheet manifest |
| `workspaces/dealbook/data/` | JSON generated from the CSV (`pnpm dealbook:build:data`) |
| `workspaces/dealbook/schema/` | Post / platform-variant JSON Schema |
| `workspaces/dealbook/media/` | Local media library (gitignored; see its README) |
| `workspaces/dealbook/hub/` | **Shelf**: original social hub SPA and local server |

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Clip and transcribe run ffmpeg in [Vercel Sandbox](https://vercel.com/docs/sandbox). Environment variables live in the Vercel project; pull them into `.env.local`. A pull rewrites the whole file, so re-add any values you set only locally (such as `AI_GATEWAY_API_KEY`) afterwards. Transcription uses [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (`AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` on deployed builds):

```bash
vercel env pull .env.local   # project env (Development target) + Sandbox auth token, ~12 h
pnpm try:transcribe '<url>' 60 120   # extract + transcribe a range from the CLI
pnpm try:clip '<url>' 60 120 team    # export a clip (team | copy) and print a 1-hour download link
```

Both use the private Vercel Blob store `dealbook-clips`. Local files upload from the browser straight to `uploads/` (up to 5 GB; Functions can't accept request bodies over ~4.5 MB), and exported clips go to `clips/`. The app hands out signed download links that expire after an hour; nothing is deleted automatically.

`.env.example` lists the variables. To rebuild the ffmpeg snapshot, run `pnpm sandbox:snapshot` and update `FFMPEG_SNAPSHOT_ID` in Vercel.

## DealBook commands

```bash
pnpm dealbook:sync         # Google Sheet → source/content-calendar.csv + data/*.json
pnpm dealbook:hub:start    # legacy hub with local media at http://127.0.0.1:4173
```

Sheet manifest: **`workspaces/dealbook/source/calendar-source.json`**. Details in **`AGENTS.md`** and `workspaces/dealbook/hub/README.md`.

## Checks

```bash
pnpm check   # lint, typecheck, DealBook hub tests, Vitest for lib/
```

## Deploy

The Next.js app deploys to Vercel from `main`. The legacy DealBook hub is local-only; `pnpm dealbook:hub:build` writes a static copy to `workspaces/dealbook/hub/dist/` if you need one.
