# Agent guide — Media Utils

Instructions for humans and coding agents working in this repo.

**Media Utils** is a Next.js app at the repo root (`app/`, `components/`, `lib/`): a growing library of tools to package and prepare content for social and production. Content for a specific show or client lives in a **workspace** under `workspaces/<name>/`. The only workspace today is **DealBook** (`workspaces/dealbook/`), whose original social hub is frozen under `workspaces/dealbook/hub/`; cherry-pick hub features into Next rather than extending the SPA.

## App structure

- **Tool registry:** `lib/tools.ts`. Each tool has a `slug` and is served at `/<slug>` from `app/<slug>/page.tsx`, with components in `components/<slug>/`. The sidebar and dashboard read the registry, so register new tools there.
- **Shared media helpers:** `lib/media/` (ffmpeg args, Vercel Sandbox, transcription, Blob exports).
- **Old URLs:** `/tools/<slug>` permanently redirects to `/<slug>` (`next.config.ts`).
- Keep tool code workspace-agnostic. Anything specific to one show or client belongs in its workspace folder.

## DealBook workspace: source of truth (data)

Paths below are relative to `workspaces/dealbook/`.

| Layer | What | Who edits |
|-------|------|-----------|
| **1. Google Sheet** | Live content calendar (dates, copy, platforms, column J/K/L, etc.) | Editorial / ops in Sheets |
| **2. `source/content-calendar.csv`** | Committed snapshot used by builds and tests | Pulled via `pnpm dealbook:sync` (do not hand-edit unless fixing an export emergency) |
| **3. `source/research/`** | Speaker one-pagers HTML | Editorial; committed in Git |
| **4. `data/*.json`** | Generated posts, research merge, dataset | Never edit; run `pnpm dealbook:build:data` |
| **5. `hub/dist/`** | Legacy static hub output (gitignored) | Never edit; run `pnpm dealbook:hub:build` |

Manifest for the sheet (IDs, tab `gid`, paths): **`workspaces/dealbook/source/calendar-source.json`**.

- **Edit URL:** [Content calendar sheet](https://docs.google.com/spreadsheets/d/1-d2UHAbvuSlndFefisZPtI31yBsFUse6729QRRBjB9Q/edit?gid=796154075)
- Export requires **anyone with the link can view** (or broader). If export fails with HTML/403, fix sharing or paste a CSV export manually into `source/content-calendar.csv`.

**Media** is not in the sheet pipeline: local files only under **`workspaces/dealbook/media/`** (see its `README.md`). No Vercel upload for media in the current design.

## Refresh calendar from Google Sheets

```bash
pnpm dealbook:sync          # sheet → source/content-calendar.csv + data/*.json
pnpm dealbook:sync:dry      # preview CSV changes only (no build)
pnpm dealbook:hub:build     # after sync, rebuild legacy static site → hub/dist/
```

After refreshing, run **`pnpm check`** before committing CSV changes.

Typical commit message when only the sheet changed: `chore: sync DealBook content calendar from Google Sheets`.

## Local workflow (scale)

The package manager is **pnpm** (pinned in `package.json` `packageManager`). Don't use npm or commit a `package-lock.json`. Use package scripts rather than one-off paths. Workspace scripts are prefixed with the workspace name (`dealbook:*`, `test:dealbook`).

| Goal | Command |
|------|---------|
| Next dev server | `pnpm dev` |
| Lint, typecheck, all tests | `pnpm check` |
| Pull latest DealBook sheet | `pnpm dealbook:sync` |
| Regenerate DealBook JSON from `source/` | `pnpm dealbook:build:data` |
| Legacy hub with local media | `pnpm dealbook:build:data` then `pnpm dealbook:hub:start` |
| Legacy static hub | `pnpm dealbook:hub:build` |

Environment override: `HUB_MEDIA_ROOT` at build time (relative to `workspaces/dealbook/`) to index a non-default media directory.

## Deploy

The Next.js app deploys to Vercel (`pnpm build`) as the `media-utils` project. DealBook calendar changes ship via the **committed** CSV, not live Sheets: sync → commit CSV → push.

## How to update documentation

### `README.md` (operators & new contributors)

Update when **user-facing behavior or commands** change:

- Repository layout tables → new top-level dirs, new workspaces, or changed roles of workspace folders
- Install / dev / deploy steps → new package scripts or hosting fields
- What deploy includes vs local-only features

Keep README short. Link to **`AGENTS.md`** for source-of-truth hierarchy and agent workflows.

### `AGENTS.md` (this file)

Update when **workflow, sheet IDs, or agent rules** change:

- New tools or workspaces that change the structure above
- New sync script flags or manifest fields in `calendar-source.json`
- Changes to what is authoritative (e.g. if research moves to another system)
- Commit conventions or required checks after sync

### `workspaces/dealbook/media/README.md`

Update only for **on-disk media layout** conventions.

### Do not duplicate

- Sheet URL and `gid` live in **`workspaces/dealbook/source/calendar-source.json`**; README/AGENTS link to it or the edit URL, not a second copy of IDs unless necessary for readability.

## Code touchpoints for DealBook calendar changes

- **Parse/build:** `workspaces/dealbook/hub/scripts/build-data.mjs`, `hub/lib/csv.mjs`, `hub/lib/parse-source.mjs`, `hub/lib/post-model.mjs`
- **Tests:** `workspaces/dealbook/hub/test/calendar.test.mjs`, `hub/test/parsing.test.mjs`
- **Next UI:** root `app/`; hub features rebuilt here over time

If column layout in the sheet changes, update `COL` in `workspaces/dealbook/hub/scripts/build-data.mjs` and tests together.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
