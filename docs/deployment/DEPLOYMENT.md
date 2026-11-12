# Deployment Guide

> **Vercel is the only production host** (decided 2026-11-11). The Cloudflare Workers (`wrangler.toml`) and Netlify (`netlify.toml`) configs, and the old Render migration guide, were removed.

## Current setup

| Item              | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Live URL          | https://wordplay-blond.vercel.app (no custom domain yet)               |
| Vercel project    | `wordplay` under _Tyrale's projects_                                   |
| Production branch | `master`. Every push deploys; PRs get preview deployments              |
| Config            | [`vercel.json`](../../vercel.json): build, SPA rewrites, asset caching |
| Node.js           | Set in Vercel project settings (Node 22+); CI uses `.nvmrc`            |

`vercel.json` lives at the **repo root**. The Vercel project's Root Directory is the repo root, so Vercel never reads a `vercel.json` inside `apps/web/`. It sets:

- **Build command**: `npm run build` (root script → `apps/web`: `tsc -b && vite build`)
- **Output directory**: `apps/web/dist`
- **Install command**: `npm install --include=dev`. Dev dependencies (TypeScript, Vite) must be installed even if `NODE_ENV=production` is set in the dashboard, or the build fails with `tsc: command not found`.
- **SPA rewrites**: all routes serve `/index.html`
- **Asset caching**: `/assets/*` cached for 1 year (filenames are content-hashed)

## Environment variables

Set in Vercel → Project Settings → Environment Variables, for **Production** and **Preview**:

| Name                     | Value                               |
| ------------------------ | ----------------------------------- |
| `VITE_SUPABASE_URL`      | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the project's anon (public) key     |

Without these, the build falls back to `https://placeholder.supabase.co` (see `apps/web/src/lib/supabase.ts`). Single-player still works, but **multiplayer, the daily challenge leaderboard and community unlock counts don't**.

`VITE_` variables are baked into the bundle at build time, so **redeploy after changing them**.

To check which Supabase project a live build points at:

```bash
curl -s https://wordplay-blond.vercel.app/ | grep -o '/assets/index-[^"]*\.js'
```

Then fetch that asset and search it for `supabase.co`.

`NODE_ENV` does not need to be set; Vite builds in production mode on its own.

## Setting up from scratch

1. Vercel dashboard → **Add New… → Project** → import the `wordplay` GitHub repo.
2. Vercel detects Vite; `vercel.json` supplies the rest.
3. Add the environment variables above.
4. Deploy, then confirm the live URL loads and multiplayer can create a game.

## Troubleshooting

- **Build fails**: open the deployment's logs (dashboard, or `npx vercel inspect <deployment-url> --logs`). Reproduce locally with `npm ci && npm run build`.
- **Multiplayer/leaderboard silently empty in production**: the Supabase variables are missing or wrong. See the check above.
- **Env var change not reflected**: trigger a redeploy; `VITE_` values are build-time.
