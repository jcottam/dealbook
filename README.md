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
| `workspaces/dealbook/scripts/` | Sheet sync and JSON build |
| `workspaces/dealbook/lib/` | Calendar parse/build helpers used by those scripts |
| `workspaces/dealbook/schema/` | Post / platform-variant JSON Schema |
| `workspaces/dealbook/media/` | Local media library (gitignored; see its README) |

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Clip and transcribe run ffmpeg in [Vercel Sandbox](https://vercel.com/docs/sandbox). Environment variables live in the Vercel project; pull them into `.env.local`. A pull rewrites the whole file, so re-add any values you set only locally (such as `AI_GATEWAY_API_KEY`) afterwards. Transcription uses [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (`AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` on deployed builds):

```bash
vercel env pull .env.local   # project env (Development target) + Sandbox auth token, ~12 h
pnpm try:transcribe '<url>' 60 120   # extract + transcribe a range from the CLI
pnpm try:clip '<url>' 60 120 team    # export a clip (team | copy) and print the public download URL
```

Blob: private **`media-utils`** for source uploads (`BLOB_STORE_ID` + OIDC; client uploads use presigned URLs); public **`media-utils-clips-public`** for exported clips and images (`BLOB_READ_WRITE_TOKEN`). Mimir URLs are read directly in Sandbox. Local files upload to private `uploads/` (up to 5 GB); clips land in public `clips/` and images in public `images/`, both with stable URLs. Nothing is deleted automatically.

### Image uploader (`/images`)

Upload JPG, PNG, WebP, GIF, or HEIC images (up to 50 MB each) by drag and drop, file picker, or paste. Each one gets a public link that keeps its original filename (`images/<id>/_DSC0457.jpg`), and the page lists everything under `images/` with copy and delete buttons. Files go straight from the browser to Blob ([client uploads](https://vercel.com/docs/vercel-blob/client-upload)), so the Function body limit doesn't apply. `/api/images/upload` only issues upload tokens; `/api/images` lists and deletes.

**Labels and sheet copy.** Images and clips take an optional label, such as the original Mjoll path or "Title slide". **Copy for sheet** copies text for the content calendar's "Source w/ timestamps" column, one line per asset:

```text
Title slide: https://…/images/…/_DSC0457.jpg
Musk quote (00:04:55–00:05:17): https://…/clips/…/clip.mp4
"I have no problem being hated…"
```

In the image uploader, select the images for a post (a fresh upload batch is selected for you) and copy them together. In the clipper, the transcript line is optional. The clipboard also carries a one-cell HTML version, so pasting onto a selected Sheets cell keeps every line in that cell. Blob has no custom metadata, so a label is stored as a small `label-<base64url>.txt` blob next to its asset (`PUT /api/labels`); format lives in `lib/sheet-format.ts`.

Blob setup (once per Vercel project):

1. Vercel dashboard → **Storage** → **Create** → **Blob**, name it `media-utils-clips-public`, access **Public**. Skip this if the store already exists.
2. Open the store → **Connect Project** → `media-utils`, all environments. This adds `BLOB_READ_WRITE_TOKEN`. If another store already owns that variable, disconnect it or use a custom prefix for the other store.
3. Redeploy so the new variable and the `next/image` allowlist for the store's host are picked up at build time.
4. Locally: `vercel env pull .env.local`.

Deleted images can stay in the CDN cache for up to a minute.

`.env.example` lists the variables. To rebuild the ffmpeg snapshot, run `pnpm sandbox:snapshot` and update `FFMPEG_SNAPSHOT_ID` in Vercel.

## DealBook commands

```bash
pnpm dealbook:sync         # Google Sheet → source/content-calendar.csv + data/*.json
pnpm dealbook:build:data   # regenerate data/*.json from source/
```

Sheet manifest: **`workspaces/dealbook/source/calendar-source.json`**. Details in **`AGENTS.md`**.

## Checks

```bash
pnpm check   # lint, typecheck, DealBook calendar tests, Vitest for lib/ and app/ routes
```

## Deploy

The Next.js app deploys to Vercel from `main`.
