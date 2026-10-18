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
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.example` to `.env.local` when wiring clip/transcribe APIs.

## Legacy social hub

```bash
npm run hub:legacy:build:data
npm run hub:legacy:start    # http://127.0.0.1:4173
```

See `legacy/hub/README.md`.

## Content calendar (Google Sheets)

```bash
npm run sync:calendar
```

Sheet URL and manifest: **`source/calendar-source.json`**. Details in **`AGENTS.md`**.

## Tests

```bash
npm test    # legacy hub parsing/calendar tests
```

## Deploy

Primary app: **Next.js** on Vercel or Cloudflare (Zero Trust in front when ready). Legacy static hub: `npm run hub:legacy:build` → `public/`.
