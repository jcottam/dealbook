# Agent guide — DealBook

Instructions for humans and coding agents working in this repo.

The **product app** is **Next.js at the repo root** (`app/`, `components/`). The original social hub is frozen under **`legacy/hub/`**; cherry-pick features into Next rather than extending the SPA.

## Source of truth (data)

| Layer | What | Who edits |
|-------|------|-----------|
| **1. Google Sheet** | Live content calendar (dates, copy, platforms, column J/K/L, etc.) | Editorial / ops in Sheets |
| **2. `source/content-calendar.csv`** | Committed snapshot used by builds and tests | Pulled via `pnpm sync:calendar` (do not hand-edit unless fixing an export emergency) |
| **3. `source/research/`** | Speaker one-pagers HTML | Editorial; committed in Git |
| **4. `data/*.json`** | Generated posts, research merge, dataset | Never edit; run `pnpm hub:legacy:build:data` |
| **5. `public/`** | Legacy static hub output | Never edit; run `pnpm hub:legacy:build` |

Manifest for the sheet (IDs, tab `gid`, paths): **`source/calendar-source.json`**.

- **Edit URL:** [Content calendar sheet](https://docs.google.com/spreadsheets/d/1-d2UHAbvuSlndFefisZPtI31yBsFUse6729QRRBjB9Q/edit?gid=796154075)
- Export requires **anyone with the link can view** (or broader). If export fails with HTML/403, fix sharing or paste a CSV export manually into `source/content-calendar.csv`.

**Media** is not in the sheet pipeline: local files only under **`media/`** (see `media/README.md`). No Vercel upload for media in the current design.

## Refresh calendar from Google Sheets

```bash
pnpm sync:calendar          # sheet → source/content-calendar.csv + data/*.json
pnpm sync:calendar:dry      # preview CSV changes only (no build)
pnpm hub:legacy:build       # after sync, rebuild legacy static site → public/
```

After refreshing, run **`pnpm test`** before committing CSV changes.

Typical commit message when only the sheet changed: `chore: sync content calendar from Google Sheets`.

## Local workflow (scale)

The package manager is **pnpm** (pinned in `package.json` `packageManager`). Don't use npm or commit a `package-lock.json`. Use package scripts as the supported “local scale” — avoid one-off paths:

| Goal | Command |
|------|---------|
| Pull latest sheet | `pnpm sync:calendar` |
| Regenerate JSON from `source/` | `pnpm hub:legacy:build:data` |
| Next admin dev server | `pnpm dev` |
| Full legacy static site | `pnpm hub:legacy:build` |
| Local legacy hub with media | `hub:legacy:build:data` then `hub:legacy:start` |
| Tests | `pnpm test` |

Environment overrides (unchanged): `HUB_MEDIA_ROOT` at build time to index a non-default media directory.

## Deploy

**Next admin** deploys as a Next.js app (`pnpm build`). The **legacy hub** remains static (`pnpm hub:legacy:build` → `public/`). Calendar deploys use **committed** `source/content-calendar.csv`, not live Sheets. To ship sheet changes: sync → commit CSV → push.

## How to update documentation

### `README.md` (operators & new contributors)

Update when **user-facing behavior or commands** change:

- Repository layout table → new top-level dirs or changed roles of `source/`, `media/`, `data/`, `public/`
- Install / dev / deploy steps → new package scripts or hosting fields
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

- **Parse/build:** `legacy/hub/scripts/build-data.mjs`, `legacy/hub/lib/csv.mjs`, `legacy/hub/lib/parse-source.mjs`, `legacy/hub/lib/post-model.mjs`
- **Tests:** `legacy/hub/test/calendar.test.mjs`, `legacy/hub/test/parsing.test.mjs`
- **Next UI:** root `app/` (admin); hub features rebuilt here over time

If column layout in the sheet changes, update `COL` in `legacy/hub/scripts/build-data.mjs` and tests together.
