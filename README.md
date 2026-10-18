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

Clip and transcribe run ffmpeg in [Vercel Sandbox](https://vercel.com/docs/sandbox). For local use:

```bash
vercel env pull .env.local   # Sandbox auth token (re-pull when it expires, ~12 h)
pnpm sandbox:snapshot        # one-time: VM snapshot with ffmpeg; set FFMPEG_SNAPSHOT_ID
pnpm try:transcribe '<url>' 60 120   # extract + transcribe a range from the CLI
```

See `.env.example` for the other variables (`OPENAI_API_KEY`, `CLIP_ALLOWED_HOSTS`).

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
