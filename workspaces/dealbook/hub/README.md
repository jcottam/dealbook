# Legacy Social Hub (shelf)

Frozen **vanilla SPA + local Node server** that powered the original DealBook review hub. The product app is the **Next.js app at the repo root**; hub features will be rebuilt there over time.

## Run locally

From the **repo root**:

```bash
pnpm dealbook:hub:start    # API + media + SPA at http://127.0.0.1:4173
pnpm dealbook:hub:build    # static site → workspaces/dealbook/hub/dist/
pnpm test:dealbook         # calendar / parsing tests
```

Paths in `hub.config.json` are relative to the workspace root (`workspaces/dealbook/`), so `source/`, `media/`, and `data/` resolve to the folders next to this one.
