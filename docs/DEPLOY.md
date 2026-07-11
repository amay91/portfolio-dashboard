# Deploy (task D1)

The app deploys as a static SPA on **Cloudflare Pages**, with the N2 AMFI edge function riding
along as a **Cloudflare Pages Function** at `/api/amfi-nav` — one deployment, one dashboard
connection, same origin as the site (so no CSP or CORS changes were needed: `index.html`'s
`connect-src 'self'` already covers a same-origin `/api/amfi-nav` fetch).

Everything below the "Cloudflare dashboard" section is already done in this repo and verified
locally (`npm run build` + `wrangler pages dev dist`, hitting the real AMFI feed through the
Function). What's left is account-level and has to happen in your own GitHub/Cloudflare accounts —
I can't do that part for you.

## What's already in the repo

- **`app/functions/api/amfi-nav.ts`** — the Cloudflare Pages Function entry point. Thin wrapper
  around `app/src/server/amfiNav.ts`'s `handleAmfiNav()` (task N2), which does all the real work
  (fetch AMFI, parse, CORS headers, caching). Pages auto-routes this file to
  `GET/OPTIONS /api/amfi-nav` based on its path — see
  [Cloudflare's Pages Functions docs](https://developers.cloudflare.com/pages/functions/).
- **`app/wrangler.toml`** — minimal project config (`name`, `compatibility_date`,
  `pages_build_output_dir = "dist"`) so `wrangler pages dev` and Cloudflare's own build both know
  where the built site lives.
- **`npm run preview:pages`** (in `app/`) — builds the SPA and serves it *plus* the Function
  locally via `wrangler pages dev dist`, for testing the whole thing (static assets + edge
  function) exactly as Cloudflare will run it, before ever touching a real deploy.
- **`.gitignore`** (root and `app/`) — extended to ignore `.wrangler/` (Wrangler's local dev
  state) and `.env*` (secrets never get committed; the one env var this app needs is set in the
  Cloudflare dashboard instead, see below).

## Cloudflare dashboard setup (your steps)

1. **Push this repo to GitHub** (see "Git status" below — it's initialized locally with an
   initial commit, but has no remote yet).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick this
   repo.
3. **Build settings:**
   | Setting | Value |
   |---|---|
   | Root directory | `app` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Framework preset | None / Vite (either works — the build command is explicit either way) |
4. **Environment variable** (Settings → Environment variables, for the Production and Preview
   environments): `VITE_AMFI_EDGE_URL` = `/api/amfi-nav`.
   - This is a **relative** path, not a full URL — the Function always lives on the same domain
     as the static site (that's the whole point of using Pages Functions instead of a separate
     Worker), so a relative path is correct for every environment: production, and every PR
     preview URL alike.
   - Left unset, the app behaves exactly as it does today (no regression) — `resolve.ts`'s edge
     tier is opt-in via this one var (task N3), and falls back to mf.captnemo.in/mfapi.in for any
     gap either way.
5. Deploy. Cloudflare Pages gives every PR its own preview URL automatically (no extra CI
   workflow needed for this — it's built into Cloudflare's GitHub integration) satisfying D1's
   "preview deploys on PR" acceptance line.

## Verifying a deploy

- Load the preview/production URL — the dashboard should render (Sample Portfolio on first
  visit).
- `curl -i https://<your-deploy>/api/amfi-nav` should return `200`, a large ISIN-keyed JSON body,
  and `Access-Control-Allow-Origin: *`.
- Data Sources (in the dashboard's Portfolio Analysis section) should show "Pass" for every held
  fund — note that mf.captnemo.in (ISIN-based, CORS-native) often ends up as the *displayed*
  per-fund source even with the AMFI edge function healthy and reachable: `resolve.ts` races both
  in parallel and lets a successful captnemo match overwrite the AMFI one (existing design,
  predates D1) — that's normal, not a sign the edge function isn't working. Confirm the edge
  function itself independently with the `curl` check above.

## Git status

This repo was git-initialized locally as part of D1, with an initial commit of the working tree
(everything except what `.gitignore` excludes — `node_modules`, `dist`, `.wrangler`, `.env*`,
`server/feedback.db`). **No remote is configured and nothing has been pushed anywhere** — that,
and creating the actual GitHub repo, is on you:

```bash
# from the PortfolioDashboard/ root
git remote add origin <your-new-github-repo-url>
git push -u origin main
```

## Local testing without any of the above

```bash
cd app
npm run preview:pages
```

Builds the SPA and serves it locally via Wrangler, Function included, at whatever port it prints
(no Cloudflare account or GitHub push needed for this — it's fully local).
