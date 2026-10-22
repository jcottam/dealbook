# Cloudflare Zero Trust for media-utils.com

Internal tools (`/`, `/clipper`, `/images`, `/social-post-preview`, and their APIs) should require **Cloudflare Access**. Reviewers use public share links only:

| Public (no Access) | Protected (Access required) |
| --- | --- |
| `/preview/<id>` | Everything else on `media-utils.com` |
| `GET`/`POST` `/api/social-post-preview/<id>/comments` | All other `/api/*` routes |

The Next.js app also enforces this in production via `middleware.ts` (401 without Access identity headers), so the origin is not wide open if Zero Trust is misconfigured.

## If the site suddenly looks “wide open”

Check these in order:

### 1. DNS must be proxied through Cloudflare

In **Cloudflare Dashboard → DNS → Records** for `media-utils.com`:

- The `A`/`CNAME` for `@` (and `www` if used) must be **Proxied** (orange cloud), with origin pointing at Vercel.
- **DNS only** (grey cloud) sends visitors straight to Vercel; **Access applications do not run** on that path.

After toggling proxy, wait a minute and confirm `dig media-utils.com` returns Cloudflare anycast IPs (not `216.150.x.x` Vercel anycast).

### 2. Access applications and policy order

In **Zero Trust → Access → Applications**, use **self-hosted** apps on `media-utils.com` (most specific paths first):

1. **Media Utils — preview share**  
   - Path: `/preview` and `/preview/*`  
   - Policy: **Bypass** → Include: **Everyone**

2. **Media Utils — preview comments API**  
   - Path: `/api/social-post-preview/*/comments`  
   - Policy: **Bypass** → Include: **Everyone**

3. **Media Utils — app**  
   - Path: `/*` (or the whole hostname)  
   - Policy: **Allow** → your team (emails, IdP group, etc.)  
   - No “Allow everyone” / “Bypass” policy on this app except the dedicated public apps above.

Remove or fix any app that **Bypasses everyone** on `/*` or sits above the Allow policy.

### 3. Emergency bypass on Vercel

If you must reach production before Access is fixed, set `SKIP_CLOUDFLARE_ACCESS=1` on the Vercel **production** environment (remove it once Zero Trust is correct). Do not leave this on long term.

## Local development

`pnpm dev` does not send Access headers. Middleware skips enforcement unless `VERCEL_ENV=production`. Optional: route local traffic through Access with a Cloudflare tunnel or test on a staging hostname.

## Code references

- Public path list: `lib/access-public-paths.ts`
- Header check: `lib/cloudflare-access.ts`
- Editor admin affordances: `lib/media-utils-admins.ts`
