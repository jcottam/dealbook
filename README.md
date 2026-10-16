# DealBook Social Hub

Read-only review hub for the DealBook social calendar, editorial research, and (locally) media assets.

## Repository layout

| Path | Purpose |
|------|---------|
| `source/content-calendar.csv` | Content calendar snapshot (committed; pulled from Google Sheets) |
| `source/calendar-source.json` | Sheet ID, tab `gid`, and sync target path |
| `source/research/` | Editorial one-pagers (committed) |
| `media/` | **Local media only** — `Post N - …` folders (gitignored; see `media/README.md`) |
| `data/` | Generated JSON from CSV (`npm run build:data`); gitignored except `asset-map.json` |
| `schema/` | Canonical post / platform-variant JSON Schema |
| `app/` | Frontend (hash router SPA) |
| `server/` | Local Node server (API, media, thumbnails) |
| `lib/` | Parsing, matching, shared hub state |
| `public/` | **Static deploy output** (`npm run build`); gitignored |

## Content calendar (Google Sheets)

The live calendar is edited in [Google Sheets](https://docs.google.com/spreadsheets/d/1-d2UHAbvuSlndFefisZPtI31yBsFUse6729QRRBjB9Q/edit?gid=796154075). Refresh the repo copy before build or deploy:

```bash
npm run sync:calendar      # sheet → source/content-calendar.csv + data/*.json
```

See **`AGENTS.md`** for source-of-truth layers, deploy implications, and doc update rules.

## Local development (full features)

```bash
npm install
npm run build:data   # refresh data/ from source/
npm start            # http://127.0.0.1:4173
```

Default **Settings → Media root** is `media/` (see `hub.config.json`). That folder should contain `Post N - …` delivery directories and optional year/speaker archives. The server scans disk, serves `/media`, and generates video thumbnails when `ffmpeg` is installed.

## Deploy (calendar + research preview)

```bash
npm run build        # source/ → data/ → public/
```

Deploy the **`public/`** directory. The app loads `/data/*.json` and does not require a Node runtime on the host.

### Vercel (recommended default)

1. Import the Git repo in Vercel.
2. Use defaults: **Build command** `npm run build`, **Output directory** `public`, **Framework preset** Other (static; no Node server).
3. Deploy. The `media/` tree stays local — `.vercelignore` keeps it out of uploads.

**Why Vercel first:** This project is a static SPA after build. Vercel’s zero-config flow matches that exactly—no Workers/R2 setup unless you need it.

### Cloudflare Pages

1. Connect the repo → **Build command** `npm run build` → **Build output directory** `public`.
2. Deploy.

**Choose Cloudflare when** you plan to put large media on **R2** and serve it from the same account. The hub UI stays static; you’d add public media URLs later (not bundled in Git).

### What deploy does *not* include

Hosted static builds do not run the local file server, `ffmpeg`, or “Reveal in Finder”. For full media review, use `npm start` locally. Optional CI: set `HUB_MEDIA_ROOT` during `npm run build` to index paths from a checkout that includes media (still without serving files unless you add a CDN).

## Data files

| Runtime | Posts API | Master schema export |
|---------|-----------|----------------------|
| Local (`npm start`) | `/api/posts` from `data/posts.json` + live scan | `data/dataset.json` (build only) |
| Static (`public/`) | `/data/posts.json` | `/data/dataset.json` |

## Tests

```bash
npm test
```
