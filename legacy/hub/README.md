# Legacy Social Hub (shelf)

Frozen **vanilla SPA + local Node server** that powered the original DealBook review hub. The product app is now **Next.js at the repo root**; hub features will be rebuilt there over time.

## Run locally

From the **repo root**:

```bash
pnpm hub:legacy:start    # API + media + SPA at http://127.0.0.1:4173
pnpm hub:legacy:build    # static site → public/ (old Vercel flow)
pnpm test:legacy         # calendar / parsing tests
```

`source/`, `media/`, and `data/` remain at the repo root; paths in `hub.config.json` are relative to the monorepo root.
