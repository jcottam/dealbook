# Agent guide — DealBook Social Hub

Instructions for humans and coding agents working in this repo.

## Source of truth (data)

| Layer | What | Who edits |
|-------|------|-----------|
| **1. Google Sheet** | Live content calendar (dates, copy, platforms, column J/K/L, etc.) | Editorial / ops in Sheets |
| **2. `source/content-calendar.csv`** | Committed snapshot used by builds and tests | Pulled via `npm run sync:calendar` (do not hand-edit unless fixing an export emergency) |
| **3. `source/research/`** | Speaker one-pagers HTML | Editorial; committed in Git |
| **4. `data/*.json`** | Generated posts, research merge, dataset | Never edit; run `npm run build:data` |
| **5. `public/`** | Static site output | Never edit; run `npm run build` |

Manifest for the sheet (IDs, tab `gid`, paths): **`source/calendar-source.json`**.

- **Edit URL:** [Content calendar sheet](https://docs.google.com/spreadsheets/d/1-d2UHAbvuSlndFefisZPtI31yBsFUse6729QRRBjB9Q/edit?gid=796154075)
- Export requires **anyone with the link can view** (or broader). If export fails with HTML/403, fix sharing or paste a CSV export manually into `source/content-calendar.csv`.

**Media** is not in the sheet pipeline: local files only under **`media/`** (see `media/README.md`). No Vercel upload for media in the current design.

## Refresh calendar from Google Sheets

```bash
npm run sync:calendar          # sheet → source/content-calendar.csv + data/*.json
npm run sync:calendar:dry      # preview CSV changes only (no build)
npm run refresh                # sync:calendar + static site (public/)
```

After refreshing, run **`npm test`** before committing CSV changes.

Typical commit message when only the sheet changed: `chore: sync content calendar from Google Sheets`.

## Local workflow (scale)

Use npm scripts as the supported “local scale” — avoid one-off paths:

| Goal | Command |
|------|---------|
| Pull latest sheet | `npm run sync:calendar` |
| Regenerate JSON from `source/` | `npm run build:data` |
| Full static site | `npm run build` |
| Local hub with media | `npm run build:data` then `npm start` |
| Static preview only | `npm run build` then `npm run preview` |
| Tests | `npm test` |

Environment overrides (unchanged): `HUB_MEDIA_ROOT` at build time to index a non-default media directory.

## Deploy

Production is **static** on Vercel (`vercel.json`: `npm run build`, output `public/`). Deploys use **committed** `source/content-calendar.csv`, not live Sheets. To ship sheet changes: sync → commit CSV → push (Vercel rebuilds).

## How to update documentation

### `README.md` (operators & new contributors)

Update when **user-facing behavior or commands** change:

- Repository layout table → new top-level dirs or changed roles of `source/`, `media/`, `data/`, `public/`
- Install / dev / deploy steps → new npm scripts or hosting fields
- What deploy includes vs local-only features

Keep README short. Link to **`AGENTS.md`** for source-of-truth hierarchy and agent workflows.

### `AGENTS.md` (this file)

Update when **workflow, sheet IDs, or agent rules** change:

- New sync script flags or manifest fields in `source/calendar-source.json`
- Changes to what is authoritative (e.g. if research moves to another system)
- Commit conventions or required checks after sync

### `media/README.md`

Update only for **on-disk media layout** conventions.

### Do not duplicate

- Sheet URL and `gid` live in **`source/calendar-source.json`**; README/AGENTS link to it or the edit URL, not a second copy of IDs unless necessary for readability.

## Code touchpoints for calendar changes

- **Parse/build:** `scripts/build-data.mjs`, `lib/csv.mjs`, `lib/parse-source.mjs`, `lib/post-model.mjs`
- **Tests:** `test/calendar.test.mjs`, `test/parsing.test.mjs`
- **Frontend:** `app/` (consumes built JSON only)

If column layout in the sheet changes, update `COL` in `build-data.mjs` and tests together.
