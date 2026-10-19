# Agent guide — Media Utils

Instructions for humans and coding agents working in this repo.

**Media Utils** is a Next.js app at the repo root (`app/`, `components/`, `lib/`): a growing library of tools to package and prepare content for social and production. Content for a specific show or client lives in a **workspace** under `workspaces/<name>/`. The only workspace today is **DealBook** (`workspaces/dealbook/`).

## App structure

- **Tool registry:** `lib/tools.ts`. Each tool has a `slug` and is served at `/<slug>` from `app/<slug>/page.tsx`, with components in `components/<slug>/`. The sidebar and dashboard read the registry, so register new tools there.
- **Shared media helpers:** `lib/media/` (ffmpeg args, Vercel Sandbox, transcription, Blob exports).
- **Blob stores:** private `media-utils` (OIDC + `BLOB_STORE_ID` + `BLOB_WEBHOOK_PUBLIC_KEY`) for source uploads under `uploads/` via `handleUploadPresigned` / `uploadPresigned`; public `media-utils-clips-public` (`BLOB_READ_WRITE_TOKEN`) for `clips/` and `images/` via `handleUpload`. When both are configured the SDK defaults to OIDC, so public-store calls must pass `publicBlobToken()` from `lib/blob.ts` explicitly. Do not use `handleUpload` for private uploads — it signs with `BLOB_READ_WRITE_TOKEN` (the public store).
- **Asset labels:** every public image or clip lives in its own folder (`images/<id>/<file>`, `clips/<uuid>/<file>`), and its optional label is a sidecar blob in that folder (`lib/asset-labels.ts`). Keep that layout for new public asset types so `PUT /api/labels` and folder deletes keep working. Text for the content calendar's column J comes from `lib/sheet-format.ts`, shared by every tool, so keep one format.
- **Tests:** Vitest runs `lib/**/*.test.ts` and `app/**/*.test.ts` (route handlers, with `@vercel/blob` mocked). DealBook calendar tests run via `pnpm test:dealbook`.
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

Manifest for the sheet (IDs, tab `gid`, paths): **`workspaces/dealbook/source/calendar-source.json`**.

- **Edit URL:** [Content calendar sheet](https://docs.google.com/spreadsheets/d/1-d2UHAbvuSlndFefisZPtI31yBsFUse6729QRRBjB9Q/edit?gid=796154075)
- Export requires **anyone with the link can view** (or broader). If export fails with HTML/403, fix sharing or paste a CSV export manually into `source/content-calendar.csv`.

**Media** is not in the sheet pipeline: local files only under **`workspaces/dealbook/media/`** (see its `README.md`). No Vercel upload for media in the current design.

## Refresh calendar from Google Sheets

```bash
pnpm dealbook:sync          # sheet → source/content-calendar.csv + data/*.json
pnpm dealbook:sync:dry      # preview CSV changes only (no build)
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

- **Parse/build:** `workspaces/dealbook/scripts/build-data.mjs`, `lib/csv.mjs`, `lib/parse-source.mjs`, `lib/post-model.mjs`
- **Tests:** `workspaces/dealbook/test/calendar.test.mjs`, `test/parsing.test.mjs`
- **Next UI:** root `app/`

If column layout in the sheet changes, update `COL` in `workspaces/dealbook/scripts/build-data.mjs` and tests together.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
