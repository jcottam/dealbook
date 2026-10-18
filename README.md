# DealBook

Internal **Next.js admin** (clip tools, future hub). Editorial calendar data stays in `source/`; the legacy social hub SPA lives under `legacy/hub/`.

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router (admin UI + API routes) |
| `components/` | UI and tools (ShadCN) |
| `source/` | Content calendar CSV, research HTML, sheet manifest |
| `media/` | Local media library (gitignored; see `media/README.md`) |
| `data/` | Generated JSON from CSV (`hub:legacy:build:data`) |
| `schema/` | Post / platform-variant JSON Schema |
| `legacy/hub/` | **Shelf** — original SPA + local server |
| `public/` | Legacy static export output (gitignored) |

## Local development (Next admin)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Clip and transcribe run ffmpeg in [Vercel Sandbox](https://vercel.com/docs/sandbox). Environment variables live in the Vercel project; pull them into `.env.local`. A pull rewrites the whole file, so re-add any values you set only locally (such as `OPENAI_API_KEY`) afterwards:

```bash
vercel env pull .env.local   # project env (Development target) + Sandbox auth token, ~12 h
pnpm try:transcribe '<url>' 60 120   # extract + transcribe a range from the CLI
pnpm try:clip '<url>' 60 120 team    # export a clip (team | copy) and print a 1-hour download link
```

Both use the private Vercel Blob store `dealbook-clips`. Local files upload from the browser straight to `uploads/` (up to 5 GB; Functions can't accept request bodies over ~4.5 MB), and exported clips go to `clips/`. The app hands out signed download links that expire after an hour; nothing is deleted automatically.

`.env.example` lists the variables. To rebuild the ffmpeg snapshot, run `pnpm sandbox:snapshot` and update `FFMPEG_SNAPSHOT_ID` in Vercel.

## Legacy social hub

```bash
pnpm hub:legacy:build:data
pnpm hub:legacy:start    # http://127.0.0.1:4173
```

See `legacy/hub/README.md`.

## Content calendar (Google Sheets)

```bash
pnpm sync:calendar
```

Sheet URL and manifest: **`source/calendar-source.json`**. Details in **`AGENTS.md`**.

## Tests

```bash
pnpm test    # legacy hub tests + Vitest for lib/
```

## Deploy

Primary app: **Next.js** on Vercel or Cloudflare (Zero Trust in front when ready). Legacy static hub: `pnpm hub:legacy:build` → `public/`.
