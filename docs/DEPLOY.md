# Deploy (task D1, extended by D3)

The app deploys as a static SPA on **Cloudflare Pages**, with two **Cloudflare Pages Functions**
riding along at `/api/amfi-nav` (task N2/D1) and `/api/feedback` (task D3) — one deployment, one
dashboard connection, same origin as the site (so no CSP or CORS changes were needed:
`index.html`'s `connect-src 'self'` already covers same-origin fetches to either).

Everything below the "Cloudflare dashboard" section is already done in this repo and verified
locally (`npm run build` + `wrangler pages dev dist`, hitting the real AMFI feed through
`/api/amfi-nav`, and a local mock webhook receiver through `/api/feedback`). What's left is
account-level and has to happen in your own GitHub/Cloudflare accounts — I can't do that part for
you.

## What's already in the repo

- **`app/functions/api/amfi-nav.ts`** — the Cloudflare Pages Function entry point. Thin wrapper
  around `app/src/server/amfiNav.ts`'s `handleAmfiNav()` (task N2), which does all the real work
  (fetch AMFI, parse, CORS headers, caching). Pages auto-routes this file to
  `GET/OPTIONS /api/amfi-nav` based on its path — see
  [Cloudflare's Pages Functions docs](https://developers.cloudflare.com/pages/functions/).
- **`app/functions/api/feedback.ts`** — same pattern, wrapping `app/src/server/feedbackWebhook.ts`'s
  `handleFeedbackWebhook()` (task D3): validates a `{category, message}` POST body (same rules as
  the local dev server — allowed categories, non-empty, under 5000 chars), neutralizes
  Slack/Discord mention syntax (`@everyone`, `@here`, `<!channel>` etc. — this is a public-facing
  endpoint accepting free text from anyone), then forwards it to a webhook URL read from
  `env.FEEDBACK_WEBHOOK_URL` (a Cloudflare Pages **secret**, not a public `VITE_` var — see below).
  The forwarded payload includes both `text` (Slack's field) and `content` (Discord's field) set
  to the same formatted string, plus raw `category`/`message`/`submittedAt` fields for a generic
  webhook catcher (Zapier/Make/n8n) if you'd rather use one of those instead.
- **`app/src/features/feedback/Feedback.tsx`** — posts to `VITE_FEEDBACK_URL` if set, else the
  local dev server (`http://127.0.0.1:8766/api/feedback`, unchanged default — no regression for
  local dev if you leave this unset). Also swaps the "server not running, start it with..." error
  message for a generic one when running against the edge endpoint, since that instruction only
  makes sense in local dev.
- **`app/wrangler.toml`** — minimal project config (`name`, `compatibility_date`,
  `pages_build_output_dir = "dist"`) so `wrangler pages dev` and Cloudflare's own build both know
  where the built site lives.
- **`npm run preview:pages`** (in `app/`) — builds the SPA and serves it *plus* both Functions
  locally via `wrangler pages dev dist`, for testing the whole thing (static assets + edge
  functions) exactly as Cloudflare will run it, before ever touching a real deploy. For
  `/api/feedback` specifically, `wrangler pages dev` reads a local `app/.dev.vars` file
  (gitignored, never committed) for `FEEDBACK_WEBHOOK_URL` — see "Local testing" below.
- **`.gitignore`** (root and `app/`) — ignores `.wrangler/` (Wrangler's local dev state), `.env*`
  (Vite build-time vars), and `.dev.vars` (Wrangler's local **secrets** file, e.g. a real
  `FEEDBACK_WEBHOOK_URL` for your own local testing) — none of these ever get committed; the real
  values live in the Cloudflare dashboard instead, see below.

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
4. **Environment variables** (Settings → Environment variables, for the Production and Preview
   environments):
   | Variable | Value | Type |
   |---|---|---|
   | `VITE_AMFI_EDGE_URL` | `/api/amfi-nav` | Plain text |
   | `VITE_FEEDBACK_URL` | `/api/feedback` | Plain text |
   | `FEEDBACK_WEBHOOK_URL` | *(your Slack or Discord Incoming Webhook URL)* | **Secret** |
   - The two `VITE_` vars are **relative** paths, not full URLs — both Functions always live on
     the same domain as the static site (that's the whole point of using Pages Functions instead
     of a separate Worker), so a relative path is correct for every environment: production, and
     every PR preview URL alike.
   - `VITE_AMFI_EDGE_URL` left unset behaves exactly as before D1 (no regression) — `resolve.ts`'s
     edge tier is opt-in (task N3), falling back to mf.captnemo.in/mfapi.in for any gap either way.
   - `VITE_FEEDBACK_URL` left unset means the deployed site's Feedback form will try to reach
     `127.0.0.1:8766` — i.e. **every visitor's own machine**, which never has that server running.
     Feedback submissions will silently fail for real users until this is set; there's no
     "fallback to something else" here the way there is for NAV lookups. Set it before shipping if
     you want the Feedback button to actually work in production.
   - `FEEDBACK_WEBHOOK_URL` needs a real Incoming Webhook URL from wherever you want to receive
     submissions — [Slack](https://api.slack.com/messaging/webhooks) or
     [Discord](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) both
     offer free, no-code "Incoming Webhook" URLs you create from a channel's settings; the handler
     is compatible with either without any code changes (see `feedback.ts` above). Mark this one
     as a **Secret**, not plain text — Cloudflare hides secret values in the dashboard/logs after
     they're set, same care as any credential. Left unset, `/api/feedback` responds `500
     "Feedback isn't configured on this deployment yet"` rather than crashing or silently
     dropping submissions — you'll notice quickly if you forget this step.
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
- `curl -i -X POST https://<your-deploy>/api/feedback -H "Content-Type: application/json" -d
  '{"category":"Bug Report","message":"deploy check"}'` should return `201 {"ok":true}`, and the
  message should show up wherever `FEEDBACK_WEBHOOK_URL` points (your Slack channel/Discord
  channel/webhook catcher) within a few seconds. If it returns `500`, `FEEDBACK_WEBHOOK_URL` isn't
  set for that environment (Production and Preview are configured separately — check both if
  you're testing a PR preview URL). Delete the test message from your channel afterward if you'd
  rather not leave it there.
- Open the Feedback form in the actual UI (Help menu → Feedback) and submit something real — this
  is the path an actual user hits, and it's worth confirming once end-to-end rather than trusting
  the `curl` check alone.

## Local testing without any of the above

```bash
cd app
npm run preview:pages
```

Builds the SPA and serves it locally via Wrangler, both Functions included, at whatever port it
prints (no Cloudflare account or GitHub push needed for this — it's fully local).

For `/api/amfi-nav` this just works — it needs no secrets, only the public AMFI feed. For
`/api/feedback` to do anything other than return its "not configured" 500, create
**`app/.dev.vars`** (gitignored, never committed) with a real webhook URL:

```
FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

and rebuild your app with `VITE_FEEDBACK_URL=/api/feedback` set (e.g. in a matching, also-gitignored
`app/.env.local`) so the built site actually calls the local Function instead of
`127.0.0.1:8766`. Without a real webhook handy, point `FEEDBACK_WEBHOOK_URL` at any local HTTP
listener on your own machine to confirm the Function reaches it correctly — that's how this was
verified during development, without sending anything to a real external service.

## Feedback on GitHub Pages (Formspree)

Everything above is the **Cloudflare Pages** path. This project is actually deployed on
**GitHub Pages** (see `docs/Deploying-to-GitHub-Pages.pdf` and `.github/workflows/deploy-pages.yml`)
— a plain static host with no server-side execution at all, so it can't run
`app/functions/api/feedback.ts` (or `/api/amfi-nav`) no matter what. Live-NAV prices are unaffected
(the app already falls back to its other, CORS-native sources — mfapi.in, captnemo — when the AMFI
edge function isn't reachable), but feedback has no such fallback on its own: without a third path,
every submission on the live GitHub Pages site would just fail with a "couldn't send" error.

**The fix:** `app/src/features/feedback/feedbackEndpoint.ts`'s `resolveFeedbackEndpoint()` adds a
third tier. In priority order:

1. `VITE_FEEDBACK_URL` set (Cloudflare Pages) → that URL, unchanged from above.
2. No override, running in dev (`import.meta.env.DEV`) → the local companion server
   (`http://127.0.0.1:8766/api/feedback`), unchanged from above.
3. No override, a real production build (i.e. the GitHub Pages build) → **Formspree**
   (`https://formspree.io/f/<form-id>`) — a third-party form-relay service built for exactly this:
   static sites with no backend of their own. It's called directly from the visitor's browser, no
   code of ours involved, and every submission lands in a compiled, exportable table in the
   Formspree dashboard (Export → CSV) — no channel scrollback to dig through, no webhook to stand
   up.

**One-time setup (2 minutes, free, no credit card):**

1. Go to [formspree.io](https://formspree.io) and sign up.
2. Create a new form (any name — e.g. "Portfolio Dashboard Feedback").
3. Formspree shows you an endpoint URL shaped like `https://formspree.io/f/xanbqwrp` — that last
   segment (`xanbqwrp` here) is your form ID.
4. Open `app/src/features/feedback/feedbackEndpoint.ts` and replace the placeholder in
   `FORMSPREE_ENDPOINT` (`'https://formspree.io/f/FORMSPREE_FORM_ID'`) with your real URL.
5. Commit and push — the existing GitHub Actions workflow rebuilds and republishes automatically.
6. Submit the live site's Feedback form once to confirm — the submission (and every one after it)
   shows up under your form's **Inbox** tab at formspree.io, and can be exported as CSV any time
   from there.

No GitHub Actions secret, no Cloudflare account, no server of any kind — the form ID isn't
sensitive (it only accepts POSTs shaped like this app's feedback form; Formspree's own dashboard is
what gates who can *read* submissions), so baking it into the built JS is the same trade-off this
project already makes for `VITE_FEEDBACK_URL` and `VITE_BASE_PATH`.

## Git status

This repo was git-initialized locally as part of D1, with an initial commit of the working tree
(everything except what `.gitignore` excludes — `node_modules`, `dist`, `.wrangler`, `.env*`,
`.dev.vars`, `server/feedback.db`). **No remote is configured and nothing has been pushed
anywhere** — that, and creating the actual GitHub repo, is on you:

```bash
# from the PortfolioDashboard/ root
git remote add origin <your-new-github-repo-url>
git push -u origin main
```
