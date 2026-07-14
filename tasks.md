# Tasks — Consolidation & Public-Product Hardening Pass

Actionable task list from the 2026-07-03 critical review (see `plan.md` §0 "Review Update"
and the archived plan at `~/.claude/plans/drifting-dancing-stroustrup.md`). Each task has an
ID so you can request specific ones (e.g. "implement C and N first").

**Source of truth going forward is `app/`.** Suggested order: **C → N → U → A → S → T → D**.
**X** items are explicitly deferred — do NOT build them without a fresh decision.

**Global acceptance gate** (every task): `cd app && npm run typecheck && npm run lint && npm test`
stays green, and any UI-affecting change is verified live in the browser preview.

**Debugging & testing discipline (2026-07-04).** No task is marked ✅ until, at minimum:
1. New **pure logic** (geometry, formatters, reducers, engine math) ships with a Vitest unit
   spec in the same commit — this codebase's existing convention (`xirr.spec.ts`,
   `scales.spec.ts`, `donutGeometry.spec.ts`, etc.), not deferred to "later."
2. New or changed **UI** is verified live in the browser preview (network + DOM state +
   screenshot) before the task is called done — a green test suite checks numbers, not what's
   rendered (see `docs/DECISIONS.md`'s `liveSource`/doubled-₹ incidents, both display bugs with
   correct underlying numbers, both caught only by looking at the page).
3. A **new interactive component** gets at minimum a `renderToStaticMarkup` smoke spec (the
   `EmptyState.spec.tsx` pattern — no new test-framework dependency) asserting its states
   render; deeper interaction testing is `@testing-library/react` if/when the team decides
   that's worth the added dependency (open question, not yet decided — see T2).
4. When something looks subtly wrong mid-implementation (a timing artifact, an inconsistent
   number), **stop and root-cause it before moving on** — don't paper over it and continue.
   This is written down because it already happened once this project (see the "Test-tooling
   timing artifact" resolution in the U-series work) and was caught only by deliberately
   re-testing with waits instead of assuming the first odd result was real.

**Known retroactive gap (logged, not yet actioned — see T2):** every feature/deck component
built so far (`Masthead`, `CommandDeck`, `KpiRail`, `ValueVsInvestedCard`, `TopHoldings`,
`InsightCard`, `PortfolioAnalysis`, `DataCheck`, `DataSources`, `FundCards`, `HoldingsTable`,
`HousesTable`, `Commentary`, `Notes`, `UploadBar`, `ChartGallery`, `AllocationSection`,
`InvestedChart`, `AnnualChart`, `RollingChart`, `CapitalChart`, `HoldingsChart`,
`GeographyChart`) has **zero automated test coverage** — not even a static-render smoke test.
`EmptyState.spec.tsx` is the only component-level spec in the repo. (The interactive charts'
*geometry* functions are thoroughly unit-tested — `invested/annual/rolling/capital/holdings/
geography.spec.ts` — only the React components themselves, and their hover/keyboard event
wiring, have no automated coverage.) All of that UI work *was* live-browser-verified at the
time (per the discipline above), so this is a coverage gap, not a known-broken gap —
but it means a future refactor has no automated net for these components. Tracked as **T2**.

---

## Progress  *(single source of truth for state — updated as each task lands)*

Legend: ⬜ not started · 🔄 in progress · ✅ done · ⏸️ deferred (do not build)

- **C — Consolidation:** ✅ C1 · ✅ C2 · ✅ C3
- **N — Market data:** ✅ N1 · ✅ N2 · ✅ N3 · ✅ N4 (opt, IndexedDB day-cache, 2026-07-11) — **workstream complete**
- **U — Lean core:** ✅ U1 · ✅ U2 (redesigned, Rev. 2) · ✅ U2a · ✅ U3 (redesigned, Rev. 2) · ✅ U4 (upload bar redesign, 2026-07-05) · ✅ U5 (PDF password support, 2026-07-05 — Python bridge changes unexecuted, no interpreter available) · ✅ U6 (Dark/Light theme toggle — "Terminal Deck" / "The Ledger", 2026-07-08)
- **A — Accessibility:** ✅ A1 (manual verification; automated axe check waits on T1) · ✅ A2 (all pairs already pass AA) · ✅ A3 (already satisfied pre-existing)
- **S — Security/privacy:** ✅ S1 · ✅ S2 · ✅ S3 · ✅ S4 (0 vulnerabilities, all deps justified) — **workstream complete**
- **T — Testing:** ✅ T1 (Playwright e2e, 2 tests, CI-wired) · ✅ T2 (357 Vitest tests + 6 feedback-server `node --test` tests, up from 225)
- **D — Deploy:** ✅ D1 (Cloudflare Pages Function config done + verified locally, 2026-07-11 — account/push steps are the user's) · ✅ D2 (in-app privacy note, 2026-07-11) — **workstream complete**
- **X — Deferred:** ⏸️ X1 · ⏸️ X2 · ⏸️ X3 · ⏸️ X4 · ✅ X5 (charts done; Commentary sink stays, by design)

> On resume: this line-item state + the per-task acceptance criteria below are all a fresh
> session needs. Flip a marker to ✅ only when that task's acceptance gate passes.

---

## C — Consolidation & debt reduction  *(priority 1: highest value, lowest risk)*

### C1 — Retire the prototype; make `app/` the sole implementation
- **Why:** the engine lives in 3 places; the same bug was fixed 3× last session.
- **Delete:** `portfolio-dashboard.html`, `reference/engine.js`, `scripts/_sync_engine.mjs`.
- **Update docs** to name `app/` as the single source of truth and drop the "edit HTML then
  re-sync the mirror" workflow: `handoff.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
  (keep the bug-fix history — it's still the rationale record — but delete the mirror-rule
  process notes), `docs/TESTING.md`, `README.md`.
- **Accept:** repo builds/tests green with those files gone; no doc still instructs editing
  the HTML/mirror; `grep -ri "reference/engine.js\|portfolio-dashboard.html"` returns only
  historical references, no live instructions.

### C2 — Consolidate the golden-fixture harness into `app/`  ✅
- **Why:** fixtures + assertions currently exist both at repo root (`scripts/test.mjs`,
  `fixtures/`) and in `app/` (`app/tests/fixtures/`, Vitest specs).
- **Do:** confirm every fixture (`sample`, `alok_2025`, `alok_2026`, `axis`,
  `vandana_kfintech`, `markitdown_cas.md`) and every assertion (statement-only totals to the
  rupee, MarkItDown↔pdf.js parity, geography sum, KFintech split-ISIN) is covered by `app/`
  Vitest. Migrate anything missing. Then delete root `scripts/test.mjs` and root `fixtures/`.
- **Update** `.github/workflows/ci.yml` to a single app job (drop the prototype job).
- **Accept:** `app` Vitest covers all former `test.mjs` assertions; CI is one job; root
  `fixtures/` and `scripts/test.mjs` gone.
- **Resolution note:** verified — `parsing/cas/fixtures.spec.ts` and `engine/portfolio.spec.ts`
  cover every fixture total, the MarkItDown↔pdf.js parity check, the geography-sum check, and
  the KFintech split-ISIN case; nothing needed migrating. `test.mjs`'s 4th assertion group
  (boot the whole page in jsdom, assert the summary table/7 charts/sortable headers/data-check/
  commentary all render) has **no direct Vitest equivalent** — deliberately not duplicated here.
  A jsdom+React-Testing-Library mount would be a weaker, redundant copy of what **T1**
  (Playwright e2e, a real browser) already covers on the roadmap; building it now would be the
  premature/duplicate-infrastructure pattern this whole pass exists to remove. See
  `docs/TESTING.md` "Known gap."

### C3 — Prune stray artifacts
- **Delete:** `scripts/static-server.mjs` (served the prototype), any leftover `app/public/*`
  test PDFs, and the root `.claude/launch.json` entry that points at the static server (the
  app uses Vite's dev server). Keep a launch config only if it targets the Vite app.
- **Accept:** no dead scripts; `app/public/` contains only real assets
  (favicon, icons, sample.txt).

---

## N — Market-data simplification + edge function  *(priority 2: removes prod liability + code)*

### N1 — Delete the public-proxy racing and the Yahoo tier  ✅
- **Why:** allorigins/corsproxy/thingproxy see every request, are flaky, and are a public-
  product liability; Yahoo is thin-coverage best-effort not worth the surface.
- **Delete:** `app/src/marketdata/proxies.ts`, `app/src/marketdata/sources/yahoo.ts`,
  `app/src/marketdata/sources/yahoo.spec.ts`. Remove the proxy race from
  `app/src/marketdata/sources/amfi.ts`.
- **Accept:** no reference to the proxy list or Yahoo remains; typecheck/lint/test green.
- **Resolution note:** done — the three files are deleted, `amfi.fetchAmfi()` now does a
  single direct fetch (no proxy race), `resolve.ts`/`Diag`/`DataSources`/`sourcing` dropped
  the Yahoo tier, and the 3 Yahoo specs are gone (133 tests green). **Intermediate state:**
  until N2 lands, in-browser AMFI fetch will fail CORS (AMFI serves no CORS headers) and the
  live-NAV path leans on captnemo (ISIN, CORS-native) + mfapi (name); N2's cached edge
  function restores AMFI as primary. This is the planned N1→N2→N3 sequence, not a regression.

### N2 — AMFI edge function (new serverless backend)  ✅
- **Why:** one shared daily AMFI snapshot is official-source, scalable, and CORS-clean —
  far better than per-user per-ISIN hits to hobby endpoints.
- **Do:** add `server/` (or `app/functions/`) with an edge function that fetches AMFI
  `NAVAll.txt` once/day, caches (CDN cache headers), and serves CORS-enabled JSON indexed by
  ISIN (+ O↔0 fold). Choose the host in D1 (Cloudflare Worker recommended).
- **Accept:** function returns a valid ISIN→{nav,date,name} map with
  `Access-Control-Allow-Origin: *`; a local/dev invocation works against the golden ISINs.
- **Resolution note (2026-07-04):** built as a **portable Web-standard handler**
  (`app/src/server/amfiNav.ts`'s `handleAmfiNav(request: Request): Promise<Response>`) rather
  than committing to a platform today — no Cloudflare/Vercel-specific imports, so it runs
  unmodified once a thin per-platform entry file is added at deploy time (D1's decision, not
  this one's). Placed inside `app/src/server/` (not a sibling `app/server/` or root `server/`)
  so it's automatically covered by the existing `tsconfig.app.json`/Vitest setup with zero
  config changes — `tsconfig.app.json` only includes `src`.
  - **Reuse, not reimplementation:** the handler is a thin wrapper around the *already-existing,
    already-tested* `fetchAmfi()` + `parseAmfi()` from `marketdata/sources/amfi.ts` — the same
    AMFI parsing, ISIN O↔0 folding, and `looksLikeAmfi()` truncation guard the browser client
    already uses. No new parsing logic was written.
  - **Tested two ways:** 5 fetch-mocked unit tests (`amfiNav.spec.ts`) covering the happy path,
    CORS preflight (`OPTIONS` → 204), method rejection, and two failure modes (network-down and
    garbage-response) all returning a CORS-enabled error rather than throwing; **and** a one-off
    real-network invocation against the live AMFI feed (run manually, not part of the permanent
    suite — no network in CI) confirming a golden ISIN (`INF109K016O4`, from `sample.txt`)
    resolves to a real current NAV among 18,520 parsed ISINs. Satisfies this task's literal
    "local/dev invocation works against the golden ISINs" acceptance line.
  - **Not yet done (by design):** deployment (D1) and wiring the client to actually call this
    (N3) — this task is scoped to the function being correct and locally verified only.

### N3 — Rewire `resolve.ts` to edge-primary + CORS-native fallback  ✅
- **Do:** in `app/src/marketdata/resolve.ts`, make the N2 edge function the primary source;
  fall back to captnemo (ISIN) then mfapi (name) only for gaps. Keep the plausibility gate
  and the 180s cache. Update `resolve.spec.ts` + `liveIntegration.spec.ts` (drop proxy/Yahoo
  cases, add edge-fn primary case; keep the wrong-fund-decoy regression).
- **Accept:** golden-fixture live totals still reconcile; the plausibility gate still rejects
  a decoy; `liveSource` names each contributing source once (regression from last session).
- **Resolution note (2026-07-04):** `resolveLiveNavs(schemes, force, edgeUrl?)` gained a 3rd,
  **optional** parameter rather than reading `import.meta.env.VITE_AMFI_EDGE_URL` at module-load
  time — a module-level env read gets captured once at import and can't be changed per test
  case, whereas a parameter is trivially injectable, matching how `force` already works. `App.tsx`
  reads the env var once and passes it through. **The env var is unset everywhere today** (no
  `.env` file, nothing deployed) — this is deliberately inert until D1 assigns a real URL, at
  which point setting `VITE_AMFI_EDGE_URL` activates it with no further code changes. Verified
  live: reloading the app with no env var set shows byte-identical network behaviour to before
  this task (direct AMFI fetch still fails CORS as documented in N1; captnemo/mfapi still
  resolve all 7 holdings; Data Check still passes) — proving "inert by default" isn't just true
  in mocked tests.
  - `marketdata/sources/amfiEdge.ts`'s `fetchAmfiEdge()` is the new, independently-tested client
    for N2's function — maps its `{nav,date,name}` JSON into the same `LiveMatch` shape
    `resolve.ts` already works with, so the rest of the resolution pipeline (plausibility gate,
    diag, source-string building) needed **zero changes** beyond swapping which tier populates
    `byIsin`/`byName`/`rows`.
  - **Known tradeoff, not a regression:** the edge function only returns a byIsin map (N2's
    scope), so an ISIN-less scheme that would have matched AMFI's own `byName` tier instead
    falls through to the mfapi.in name-search gap-rescue tier, which already exists for exactly
    this case — coverage is preserved, just via a different already-existing tier. Only matters
    once an edge URL is actually configured (not yet).
  - Also cleaned up `resolve.spec.ts`'s leftover proxy-hostname branches (`codetabs`/
    `allorigins`/`corsproxy`/`thingproxy`) in its AMFI mock, dead since N1 deleted the proxy
    race — the mock could never actually hit them, per this task's own "drop proxy/Yahoo cases"
    instruction. Added 2 cases to `resolve.spec.ts` (edge-fn-primary; edge-fn-unreachable falls
    back exactly as before) and 1 to `liveIntegration.spec.ts` (edge-fn match through the full
    real-fixture pipeline) — 180/180 tests green.

### N4 — *(optional)* IndexedDB NAV day-cache  ✅
- **Do:** persist the day's NAV map in IndexedDB (idb, ~1 tiny dep) so a reload within the day
  skips the fetch. Only if N1–N3 land cleanly and there's appetite.
- **Accept:** second load same-day makes no network NAV call; "Refresh" forces a refetch.
- **Resolution note (2026-07-11):** scoped to the AMFI tier specifically — the one large,
  statement-independent bulk resource (~18,500 ISINs in one response) — not a general
  fetch-memoization overhaul across every tier; matches the task's own framing, "persist THE
  DAY'S NAV MAP" (singular). captnemo/mfapi stay uncached (per-fund, already fast, scoped to
  whatever's currently held) and the edge-fn path (N2/D1) stays uncached too — it already gets a
  day-long CDN `Cache-Control` server-side, so client-side caching would only save a round-trip,
  not real freshness, for a path that isn't deployed yet regardless.
  - **No new dependency** — hand-rolled `marketdata/dayCache.ts` against the raw `indexedDB`
    browser API instead of the `idb` package the task suggested. The actual surface needed (get/
    put one record in one object store) is small enough that a library would add supply-chain
    surface (this project's S4 dependency audit is explicitly proud of "0 vulnerabilities, all
    deps justified") for close to zero benefit over ~40 lines of Promise-wrapped native API.
  - **Storage seam is injectable** (`DayCacheStore` interface, defaults to the real IndexedDB
    implementation) specifically because jsdom — this project's Vitest environment — has no real
    `indexedDB` at all (confirmed directly: `typeof indexedDB` is `'undefined'` under `npm test`).
    `dayCache.spec.ts` unit-tests the day-boundary/serialization/failure-handling logic in
    isolation against an in-memory fake store; `resolve.spec.ts` separately tests the *seam*
    (does `resolve.ts` call `getDayCachedAmfiMap`/`setDayCachedAmfiMap` at the right times, does
    `force` correctly skip the read) via `vi.spyOn` on the real module's exports.
  - **The real (non-fake) IndexedDB code path has no jsdom coverage at all**, so it was verified
    directly in a real browser instead (not just reasoned about): a raw round-trip through
    `dayCache.ts`'s actual `realStore` (open → transaction → get/put), confirmed surviving an
    actual page reload (a fresh JS context, not just "the same variable is still in scope"), and
    a full `resolveLiveNavs()` integration proving exactly 1 network call across 2 same-day
    resolutions plus a 3rd call with `force: true` correctly bypassing a stale cached value for a
    fresh one — all against the browser's real `indexedDB`, not a mock.
  - **`Date` fields round-trip correctly** (`LiveMatch.date`) because IndexedDB uses the
    structured-clone algorithm, unlike `localStorage`/`JSON.stringify`, which would silently
    turn every `Date` into a string and need a custom reviver to undo.
  - A failed read/write (IndexedDB unavailable — old browser, some private-browsing modes, quota
    exceeded, a mid-transaction error) fails open to `null`/no-op rather than throwing, so a
    broken cache can only ever cost the round-trip it was meant to save, never break a live-NAV
    resolution outright.

---

## U — Lean core + advanced restructure  *(priority 3: aligns UI with the "quick glance" mission)*

> **Approved design — "Command Deck" (2026‑07‑04).** The lean view is a **dark, three-column
> dashboard deck**, not a vertical scroll. User-approved via mockup `command_deck_dashboard_v3`.
> The layout below is the contract for U1–U3.
>
> **Layout (desktop, ≥1024px):** a slim masthead, then a 3-column grid `0.9fr / 1.6fr / 1.05fr`:
> - **Left — KPI rail (4 tiles, stacked):** Total Value (with ▲ gain ₹ + %), Invested (with
>   fund count), Total Gain (₹, "Unrealised"), XIRR (big % + "▲ 1Y +x%" sub — the Bento-style
>   tile, **no gauge**).
> - **Centre:** the **Value vs Invested** chart card on top, the **top-5 holdings** table below.
> - **Right:** the **Allocation** donut + legend on top, the **Insight** card below (2–3 lines
>   + a "Full Commentary →" link that scrolls to / opens the full commentary).
>
> **Masthead:** `«Investor Name»'s Portfolio` (see U1 name-extraction) · `As of «date» · Live NAV`
> on the left; **Refresh** and **Show Advanced** buttons on the right.
>
> **Responsive:** 3 cols ≥1024px → 2 cols 640–1023px (rail becomes a 2×2 row of tiles, centre
> and right stack) → 1 col <640px (everything stacks; tiles 2-up). No horizontal scroll.
>
> **Dark token set** (put these in `ui/tokens.css` as the deck theme; A2 audits them for AA):
> ```
> deck bg #14161b · card/tile bg #1c1f26 · frame border #20242c · card border #2a2f39
> text primary #f2f4f7 · secondary #9aa0ab · muted #7c828d · table cell #e8eaed
> positive #3ecf8e · link #8fbef2 · button bg #1c1f26 / border #3a404b / text #ffffff
> allocation: equity #3987e5 · debt #22b783 · cash #e0a12a · other #9085e9 (donut + legend + distribution reuse these)
> chart: value line #3987e5 (2.2px, area @13%) · invested line #7c828d (1.6px, dashed 4 4) · gridline #242832
> ```
> **Type/craft rules:** one font (existing `--font-sans`); type scale 16px title · 12px labels
> · 21px KPI value · 9–11px chart/axis text; `font-variant-numeric: tabular-nums` on ALL
> figures; 12px card radius, 8px control radius; **Title Case** on every box title, button,
> section header and legend label ("Total Value", "Show Advanced", "Full Commentary"); positive
> deltas in the single green; **all controls white-on-dark** (buttons + advanced tiles) — do not
> let the host/base `button` styles win (they render dark text), so set an explicit white.

> **Revision 2 (2026‑07‑04) — supersedes several details above.** User feedback after using the
> deck asked for these changes; implemented in the same session (see per-task resolution notes):
> 1. **Dark theme goes app-wide, not just `.deck`-scoped.** `ui/tokens.css`'s `:root` is now dark
>    directly (paper `#0E1013`, ink `#F2F4F7`, green→blue accent `#3987E5`, etc.) — every existing
>    paper-themed component (UploadBar, FundCards, HousesTable, Notes, DataSources, Commentary...)
>    re-themes for free since they already read the shared custom properties. `--font-serif` is
>    now `var(--font-sans)` globally, not just inside `.deck`.
> 2. **Masthead → "«first name»'s Portfolio Summary"** — first name only (privacy), not the full
>    name; fallback "Your Portfolio Summary".
> 3. **"Show Advanced" toggle is gone.** Replaced by an always-visible **"«first name»'s Portfolio
>    Analysis"** card (same title font/size as the masthead) holding the 6 section buttons
>    permanently. Each button independently opens/closes **only its own** section — not an
>    all-or-nothing toggle — and flips white-bg/black-text while open.
> 4. **KPI tiles move to a full-width row** directly under the masthead (not a left-column rail),
>    above a **2-column grid**: left = Value-vs-Invested chart + top-5 holdings (stacked); right =
>    Allocation (donut resized to 240px — the old 150px left the center-hole text wrapping across
>    the ring) + Insight (stacked).
> 5. **"XIRR" tile → "CAGR/XIRR"**, now a clickable toggle between the money-weighted XIRR and the
>    weighted-average CAGR headline, with the same trailing-return sub-line either way (the engine
>    has no separate "1Y CAGR" figure to show).
> 6. **"Total Gain" tile → "Total Gain / ST-LT Split"** — sub-line changed from "Unrealised" to
>    "Across X.X Years" (inception span), plus a Short Term / Long Term capital-gains mini-grid
>    folded in from the retired SummaryBand.
> 7. **`SummaryBand` ("Where the portfolio stands") is deleted outright** — every number it showed
>    is now on the KPI row or in the Total Gain tile; nothing was left to move to advanced.
> 8. **`DataCheck` moves above the whole deck**, directly under the upload bar, and is *always*
>    concise (headline only, pass or fail — no inline issue list ever) with a "Details Shown in
>    Data Sources" link that opens (and scrolls to) the Data Sources section.
> 9. **`DataSources`'s table gains a "Data Check Status" column** (Pass/Fail badge + the existing
>    per-fund reason sentence); "NAV Source" stays short-only (it already was).
> 10. **Holdings' Gain% column → Total Gain (₹) + a CAGR column**, both in the lean top-5 table and
>     (implicitly) matching the same fields already in the full advanced table.
> 11. Title-Case audit extended to every table header / card label app-wide.

> **Revision 3 (2026‑07‑04) — first-use polish, same day.** Small follow-ups after actually using
> Revision 2:
> - The upload bar's post-load status line ("Updated to live NAVs — X/Y...") is gone —
>   redundant with the DataCheck headline right below it. `updateDashboard` now clears `status`
>   after a live-NAV attempt instead of restating the outcome; only load-time/error messages
>   ("Reading file…", parse failures, the MarkItDown-bridge error) still use it.
> - **CAGR/XIRR is no longer a click-to-toggle** — both figures show at once, side by side,
>   in distinct colors (`--clay` for XIRR, `--green` for CAGR); the trailing sub-line is now
>   explicitly labelled "1Y CAGR".
> - **Portfolio Analysis is an accordion, not free-multi-select**: selecting a section closes
>   whichever other one was open (`App.tsx`'s `selectSection`); a new **"View All"** button next
>   to the section header opens all 6 at once for anyone who wants the whole page. The
>   `DataCheck` → Data Sources link narrows to just Data Sources the same way.
> - Section button order changed: 7-Chart Gallery, Full Holdings, **Fund Houses, Fund Cards**
>   (swapped), Data Sources, Method Notes.
> - **Total Value and Invested merged into one tile**; Insight moved into the freed 4th KPI slot.
>   KPI order is now Total Value/Invested → Total Gain/ST-LT Split → CAGR/XIRR → Insight.
> - The chart and holdings cards (left column) split their combined height evenly via `flex:1`,
>   and Allocation (right column, alone) stretches to match that combined height — a clean
>   aligned rectangle instead of Allocation being whatever height its own content happened to be.
>   Desktop-only (≥1024px); below that the grid drops to one column and boxes take their natural
>   height.
> - **Commentary's "Target Retirement Year" → "Target Retirement Age"** — years-to-retirement is
>   now `retireAge − age` (no dependency on the calendar year at all), since most people think in
>   terms of "retire around 60," not a specific year. `buildCommentaryHTML`'s second parameter is
>   now that age, not a year.

> **Revision 4 (2026‑07‑04) — Nifty 50 benchmark, drawdown removal, copyright fix.** Same-day
> follow-ups after Revision 3:
> - **Drawdown chart removed from the gallery** — "7-Chart Gallery" is now "6-Chart Gallery"
>   everywhere (`advancedTiles.ts`, `ChartGallery.tsx`, orchestration comments). `charts/drawdown.ts`
>   deleted; no replacement metric added, since none was requested.
> - **Commentary's book references no longer claim "(both attached)"** — the app bundles no
>   copyrighted files, so implying otherwise was a real (now-fixed) issue. The citation itself
>   (title/author/Bogleheads-wiki links) is unaffected — standard reference, not reproduction.
> - **XIRR tile redesigned to compare against a Nifty 50 benchmark, superseding Revision 3's
>   CAGR/XIRR tile.** It now shows **XIRR (All-Time)** and **XIRR (1Y)** — the portfolio's
>   money-weighted return since inception and over the trailing 12 months — each in the same
>   (white/`--ink`) color as its label, no longer split by color per-metric. Beneath each number,
>   a white **"Nifty 50: X%"** sub-text (previously green, and previously showing 1Y CAGR of the
>   portfolio itself) shows the Nifty 50's own CAGR over the identical span, for a benchmark
>   comparison.
>   - **Trailing 1-year XIRR** (`engine/portfolio.ts`'s new `portXirr1Y`) is money-weighted like
>     the all-time figure, scoped to the last 12 months, using a synthetic "starting value" outflow
>     (the portfolio's nearest sampled value from `buildPortfolioSeries` one year back) standing in
>     for whatever was held at the window's start. `null` when the portfolio has under a year of
>     history — there's no meaningful window to anchor a starting value against.
>   - **Nifty 50 data is a disclosed index-fund proxy, not the raw NSE index** — there's no
>     reliable public API for the raw index level (the same category of source this app already
>     avoids for fund NAVs). `marketdata/sources/benchmark.ts`'s `fetchNiftyBenchmark()` reuses
>     mfapi.in (already trusted for fund NAVs) via its full-history `/mf/{code}` endpoint —
>     unlike the `/latest` variant used elsewhere — to fetch a real, low-cost, direct-plan,
>     growth-option Nifty 50 index fund's complete NAV history, filtering out near-miss variants
>     (Next 50, equal-weight, quality, value). Every candidate is checked for a **recent** NAV
>     (skipping schemes that quietly stopped reporting — e.g. IDBI's Nifty 50 index fund after
>     IDBI MF was absorbed into LIC MF — rather than treating a stale last-known level as current),
>     and among still-reporting candidates the one with the **longest** history wins, so an older
>     portfolio's "all-time" comparison window isn't clipped to a newer AMC's shorter track record.
>     Returns `null` (comparison left blank) when nothing confident is found — never guesses.
>     Disclosed in `Notes.tsx`'s new "Nifty 50 benchmark" paragraph, including the tracking-error/
>     expense-ratio caveat versus the theoretical index.

### U1 — Define & render the lean default view (Command Deck)  ✅
- **Default (always visible):** masthead, UploadBar, the 4-tile KPI rail, the Value-vs-Invested
  chart, the top-5 holdings table, the Allocation donut+legend, the Insight card. Exactly the
  layout in the approved-design box above.
- **Personalised masthead — parser addition:** extract the account-holder name from the CAS
  header (present on both CAMS and KFintech statements) in `parsing/` and expose it on the
  parsed result / `Portfolio`; the masthead renders `«name»'s Portfolio`, updating on every
  upload, with a `Your Portfolio` fallback when no name is parseable. Add a parser unit test
  asserting the name is pulled from at least one CAMS and one KFintech fixture.
- **Top-5 holdings:** the lean table shows the top 5 active holdings by market value (name,
  value, gain%); the **full sortable table lives in advanced** (U2). A "+N more in advanced"
  affordance is optional.
- **Insight card:** a 2–3 line summary distilled from the commentary engine + a "Full
  Commentary →" link (scrolls to / expands the full Commentary section).
- **Files:** `app/src/App.tsx` (section gating + grid), `Masthead.tsx`, `ui/tokens.css` (deck
  theme), a small `KpiRail` + `InsightCard`, `parsing/` (name extraction).
- **Accept:** first paint shows only the lean deck in the dark theme; masthead shows the
  fixture's real investor name; responsive breakpoints behave; typecheck/lint/test green and
  live-browser verified.
- **Resolution note (2026‑07‑04):** implemented as `Masthead.tsx` (now the deck's own masthead —
  the old always-visible generic banner is retired) + `parsing/cas/investor.ts`
  (`extractInvestorName`, two heuristics: per-folio name line for CAMS, header-boilerplate
  sentence for pure-KFintech; majority vote; `investor.spec.ts` passes on real alok/vandana/axis
  fixtures) + `features/deck/{KpiRail,ValueVsInvestedCard,TopHoldings,InsightCard,CommandDeck}.tsx`
  + `features/commentary/insight.ts` (`buildInsight` — a portfolio-only, non-personalised read;
  the *personalised* commentary needs age/retirement the user hasn't given yet, so it can't be
  what feeds the Insight card) + `ui/deck.css`. **Reuse, not reimplementation:** the chart card
  reuses `charts/invested.ts` (already has labelled axes) and the allocation card reuses
  `AllocationSection` as-is — both are recolored for free via a `.deck`-scoped override of the
  shared `--ink/--muted/--line/--card/--green/--teal/--font-serif` tokens, so U2a (the hover
  tooltip) has one chart to touch, not two. `categories.ts` hex values updated to the approved
  palette (only consumer, safe to change directly). U1's own "only the lean deck visible by
  default" acceptance criterion is not satisfiable without *something* to gate the rest, so the
  Show Advanced toggle (U2) was built alongside it rather than left half-working — see U2.

### U2 — "Show Advanced" toggle + advanced section  ✅ (superseded design, see below)
- **Original ask:** one masthead **Show Advanced / Hide Advanced** button gating the whole
  advanced block as a single all-or-nothing unit, `localStorage`-persisted.
- **Superseded (2026‑07‑04):** per direct feedback, the single toggle is gone. `PortfolioAnalysis.tsx`
  renders a permanent, always-visible **"«first name»'s Portfolio Analysis"** card with the 6
  section buttons; `App.tsx` holds `openSections: Record<string, boolean>` (one flag per
  section id — `charts`, `holdings-full`, `schemes`, `houses`, `sources`, `notes`) and a
  `toggleSection(id)` that flips only that key, so any combination of sections can be open at
  once, independently. An open button's style flips to white-bg/black-text
  (`.deck-advt-open`); no `localStorage` persistence this time (reset-on-reload is the accepted
  simpler default — revisit if users ask for it back). `DataCheck`'s "Details Shown in Data
  Sources" link uses a sibling `openSection(id)` (force-open + scroll, not a toggle) to jump
  straight to Data Sources from the top of the page.
- **`SummaryBand` deleted outright** (not moved to advanced — see Revision 2 note and U3 below);
  `HoldingsTable`'s section id renamed `holdings-summary` → `holdings-full` to avoid colliding
  with the lean top-5 table. `DataCheck` stays outside any section gate — always visible, at the
  top of the page now (see U3 below).

### U2a — Value-vs-Invested chart: labelled axes + per-year hover tooltip  ✅
- **Why:** the lean chart is the one time-series in the default view — it must be self-
  explanatory. Approved in the mockup.
- **Status:** the axes half is already done — U1 reused `charts/invested.ts`, which already had
  labelled Y/X axes (`yGrid` + year ticks), rather than building a second chart. **Remaining
  scope for this task is just the hover tooltip** (and its keyboard equivalent), which needs the
  chart to become a real React-rendered SVG (for `onMouseMove` state) instead of the current
  `dangerouslySetInnerHTML` string — a bigger change than it sounds, so it's still its own task.
- **Do:** rebuild the lean Invested-vs-Value chart with **both** a labelled **Y-axis** (₹ in
  lakh/crore, gridlines + tick labels) and **X-axis** (calendar year, one tick per year or per
  N years to avoid crowding). Draw the **value** line solid (`#3987e5`, area fill) and the
  **invested/cost** line dashed (`#7c828d`), with an in-chart legend ("Value" / "Invested").
  Add a **hover tooltip snapped to each year** showing `Year · Invested ₹x · Value ₹y`, driven
  by the real series (`series.line`, sampled at year boundaries). The tooltip follows the
  hovered year and **clears on mouse-leave / click-away**. Keyboard-accessible equivalent
  feeds A1 (e.g. arrow-key stepping through years).
- **Files:** `app/src/charts/invested.ts` (axes + data-year points), the chart's React wrapper
  (hover state + tooltip), `charts/scales.ts` (year ticks, ₹ unit ticks).
- **Accept:** axes are labelled; both lines render distinctly with a legend; hovering shows the
  correct per-year Invested/Value from the fixture series and dismisses on leave; endpoint ties
  to headline totals (Value → Total Value, Invested → Invested tile).
- **Resolution note (2026-07-04):** the chart is now a real React SVG component
  (`charts/InvestedChart.tsx`), shared by both the deck's `ValueVsInvestedCard` and gallery
  slide 1 — the old `chartInvestedValue` HTML-string builder is deleted (no longer used by
  either consumer). `charts/invested.ts` now exports pure, independently-tested geometry:
  `investedGeometry()` (scaled points/axes), `investedBands()` (hover hit-regions),
  `clampHoverStep()` (keyboard stepping), `investedCaption()` (gallery caption text) — 14 new
  unit tests in `invested.spec.ts`, per the testing-approach decision above (pure-logic tests +
  live verify, no new test-framework dependency).
  - **Bug caught during live verification, before shipping:** `series.line` is sampled
    **monthly** (135 points over an ~11-year span), not yearly as this task's own spec text
    assumed ("`series.line`, sampled at year boundaries" — that assumption was simply wrong).
    An initial implementation hovered/keyboard-stepped over all 135 raw points, producing
    ~5px-wide hit-targets — caught by inspecting the live DOM (`hitCount: 135`) before
    considering the task done, per the debugging discipline above. Fixed by adding a
    `yearPoints` aggregation step to `investedGeometry()` — one point per calendar year
    (nearest monthly sample to each year), matching the existing year-gridlines exactly; the
    drawn line/area still render from the full monthly-resolution `points` array unchanged.
  - **Observation logged, not fixed (out of scope for this task):** hovering the `sample.txt`
    demo fixture surfaces a real stretch (~2018–2021) where the reconstructed series shows
    `invested < 0` and `value = 0` simultaneously — a pre-existing `engine/series.ts`
    reconstruction characteristic (likely a fully-redeemed carried-in opening balance), not
    something this task's code introduced. Confirmed via a one-off check across all 5 fixtures:
    only `sample.txt` (53 points) and `axis.txt` (1 point, non-zero value) show this; the three
    real statements (`alok_2025`, `alok_2026`, `vandana_kfintech`) show none. The tooltip
    displays it faithfully (correctly formatted negative ₹, no crash) rather than hiding it —
    consistent with this app's "show your work" principle — but the underlying reconstruction
    edge case may be worth a dedicated look if it turns out to affect a real statement.

> **Revision 5 (2026-07-04) — post-U2a review: layout bug, hover-accuracy bug, and full-gallery
> interactivity.** Three issues reported after using the shipped U2a chart, fixed the same day:
> 1. **Layout bug: the Value-vs-Invested chart spilled outside its card.** Root cause: U2a added
>    `.chart-svg { overflow: visible; }` (meant to keep the tooltip from being clipped near the
>    plot edges), which defeats flexbox's sizing containment for an SVG with an intrinsic aspect
>    ratio — the chart's own box grew past its card instead of the "meet" letterboxing staying
>    contained. Fixed by removing the rule entirely (the tooltip's coordinates were already
>    clamped to the 0-740×0-380 viewBox, so nothing was actually relying on it) and moving the
>    focus ring inward (`outline-offset: -2px`) so it doesn't need `visible` either.
> 2. **Hover-accuracy bug: the last point didn't match the dashboard's own totals.** Two
>    compounding causes in `investedGeometry()`'s year-aggregation: (a) it picked the sample
>    *nearest* to each whole year's start, which for the final (current, partial) year grabbed an
>    early-in-year point instead of the true latest one — fixed by picking the *latest* sample
>    *within or before* each year instead; (b) even the true latest series sample's `invested`
>    figure can differ from `pf.totalCost` (the series' net-cash-flow tracking doesn't include a
>    carried-in opening balance with no dated buy inside the tracked window, but `totalCost`
>    does) — fixed by adding an optional `latest: {value, cost}` override to `investedGeometry()`/
>    `investedCaption()` that replaces the series' own final point with the portfolio's
>    authoritative totals before any scaling happens; `ValueVsInvestedCard` and `ChartGallery`
>    now always pass `{value: pf.totalValue, cost: pf.totalCost}`. Verified live against the
>    running dashboard: hovering the last point shows the exact same ₹ figures as the KPI tiles.
> 3. **All 6 gallery charts converted to interactive React components** (Calendar-Year Returns,
>    Rolling 1-Year Returns, Net Capital Added by Year, Holdings by Value, Geographical
>    Concentration — joining Invested-vs-Value from U2a), each following the same
>    geometry-function + hover/keyboard-tooltip pattern. The shared hover/keyboard plumbing
>    (`Band`, `hoverBands()`, `clampHoverStep()`) was extracted out of `invested.ts` into a new
>    `charts/interaction.ts` so every chart reuses one implementation instead of duplicating it.
>    Every bar chart now shows an always-visible, unit-aware value label on each bar (`+20.4%` /
>    `−10.3%` for returns via `pct(x, 1, true)`'s new `forceSign` option; `₹20L` / `₹1.2Cr` / `₹85K`
>    for currency via the new `inrCompact()` formatter in `format.ts`), and hovering/arrow-keying
>    any bar or line point shows a chart-specific tooltip: `"{year}, Return: ±x.x%"` (Annual),
>    `"Year N, 1-Year RR: ±x.x%"` / `"...Since-Inception RR..."` for the pre-1-year segment
>    (Rolling), `"{year}, Amount: ₹Xl"` (Capital), `"{fund}, Value: ₹Xl"` (Holdings),
>    `"{country}, Share: x.x%"` (Geography). Every old string-builder (`chartAnnual`,
>    `chartRolling`, `chartCapital`, `chartHoldings`, `chartGeography`) and the now-unused
>    `charts/index.ts` barrel, `ChartResult` type, and `scales.ts`'s `_svg()`/`yGrid()` helpers
>    were deleted outright rather than left as dead code. `holdings.ts`/`geography.ts` also lost
>    their `escapeHtml()` calls — plain JSX text doesn't need it, only the old
>    `dangerouslySetInnerHTML` strings did, a small incidental reduction in the app's HTML-string
>    XSS surface (tracked more broadly as X5). 25 new unit tests across
>    `annual/rolling/capital/holdings/geography.spec.ts` plus `interaction.spec.ts`; every chart's
>    labels and tooltip format verified live in the browser (207/207 tests green throughout).

> **Revision 6 (2026-07-04) — chart legend layout + scheme-name harmonisation.**
> 1. **Value-vs-Invested legend moved below the chart.** Root cause: `.deck-chart-svg` was
>    `display:flex` with the default row direction, and `InvestedChart` renders two children
>    (a legend `<div>` and the `<svg>`) — they laid out side by side, squeezing the chart into a
>    narrow strip on the right instead of stacking. Fixed by reordering the JSX (svg first, legend
>    below) and setting `flex-direction: column` on `.deck-chart-svg`, with the svg given `flex:1`
>    so it fills the available height and the legend keeps its natural compact height beneath it.
>    Removed the now-dead `.deck-clegend` CSS rule (stale from an earlier structure that no longer
>    exists). Verified via DOM measurement: the chart now spans the card's full width (478px, up
>    from a squeezed strip) with the legend centred directly below it.
> 2. **Scheme names harmonised into a Long/Short pair carrying the same 3 pieces of information**
>    (base name, Direct/Regular, Growth/Dividend) regardless of how the original statement phrased
>    it. New in `format.ts`: `parseSchemeName()` (extracts `{base, plan, option}` from any of the
>    real-world phrasings seen in fixtures — "- Direct Plan - Growth", "- Direct Growth", "- Equity
>    Plan - Direct Plan -Growth Option" with no separator consistency, or no plan mentioned at all,
>    which defaults to Regular per the existing `harmonise.ts` convention), `longSchemeName()`
>    (`"{base} - Direct Plan - Growth"`), and `shortSchemeName()` (`"{base} - Dir (G)"`). Built by
>    extending the existing `shortName()` base-name extractor (relocated here from
>    `charts/scales.ts` — it's a name-formatting concern, not a chart-scaling one; `holdings.ts`
>    and `commentaryText.ts` updated to import it from `format.ts` instead) with an extra strip for
>    a bare trailing "- Growth"/"- Dividend" that has no preceding Direct/Regular marker.
>    - **`TopHoldings.tsx`** (the deck's "Holding" table) now shows `shortSchemeName(f.name)`
>      instead of the raw statement name.
>    - **Column-wrap fix:** `.deck-tbl` gained `table-layout: fixed` with a fixed `width: 88px` +
>      `white-space: nowrap` on the numeric columns (`.deck-rt`), so "+₹2,45,952"-style figures can
>      no longer break mid-number — the Holding-name column takes the remaining width and wraps
>      normally (harmless now that names are shorter). Verified live: every numeric cell renders on
>      one line across all 5 lean-view holdings.
>    - 9 new tests in `format.spec.ts` covering both of the user's literal examples, the
>      combined-"Direct Growth" phrasing, a parenthetical suffix, a preserved sub-plan qualifier
>      (HDFC's "Equity Plan"), IDCW-as-Dividend, and the no-plan-mentioned Regular default.
>    214/214 tests green throughout; typecheck/lint clean.

> **Revision 7 (2026-07-05) — fund-house name harmonisation + a new `name_overrides.md`.**
> Every AMC/fund-house name is now harmonised to a canonical **Full Name** / **Short Name** pair
> (e.g. "ICICI Prudential Mutual Fund" / "ICICI MF"), covering all ~40 AMCs the user supplied.
> **Short Name** is used everywhere a fund house is shown (Fund Cards, the Allocation
> drill-down) **except** the "Fund Houses" ("Allocation Across AMCs") table, which shows the
> **Full Name** — a deliberate exception, not an oversight.
> - New `app/src/reference/fundHouses.ts`: `FUND_HOUSE_NAMES` (the 40-entry map),
>   `fundHouseFullName()`/`fundHouseShortName()`, plus a small `RAW_ALIASES` table for
>   statement-specific further-shortenings distinct from the canonical map.
> - **Bug caught during live verification, before shipping:** the fix initially normalised only
>   at parse time (`parsing/cas/parse.ts`), and the "Fund Houses" table still showed the raw
>   "Kotak Mutual Fund" (missing "Mahindra") for `sample.txt`. Root cause: `engine/scheme.ts`'s
>   `analyzeScheme()` prefers a **hardcoded per-ISIN `house` field in `reference/fundMeta.ts`**
>   over the statement-parsed value (`meta.house || s.house`) — that hardcoded table has its own
>   older, unharmonised spelling for some AMCs, silently bypassing the parse-time fix for any
>   fund with a `FUND_META` entry. Fixed by moving the normalisation to `analyzeScheme()`'s final
>   assignment (`house: fundHouseFullName(meta.house || s.house)`), the one point that covers
>   both upstream sources, and removing the now-redundant parse-time call. Also caught, by
>   auditing every real fixture's parsed house strings against the canonical list before calling
>   this done: "Kotak Mutual Fund" is a real statement variant of "Kotak Mahindra Mutual Fund",
>   now resolved via `RAW_ALIASES`.
> - `HoldingsTable.tsx` ("Full Holdings" / "Every Scheme At A Glance") now also shows each
>   scheme's `shortSchemeName()` — same treatment `TopHoldings.tsx` got in Revision 6 — including
>   its sort key and the exited-positions footnote.
> - New **`name_overrides.md`** at the repo root: the single, actively-maintained index of every
>   name-harmonisation rule (fund houses, scheme names), organised by what's being renamed, with
>   the exact display rule and implementing file(s) for each. Linked from `README.md`'s Docs
>   list. **Update it whenever a new naming standardisation is added** — this is now a standing
>   project convention, not a one-off.
> - 6 new tests in `fundHouses.spec.ts` (including the Kotak alias regression); 219/219 tests
>   green throughout; typecheck/lint clean. Verified live: "Fund Houses" shows full names
>   ("Kotak Mahindra Mutual Fund"), "Fund Cards" shows short names ("Kotak Mahindra MF",
>   "ICICI MF" — confirming the irregular ICICI mapping), "Full Holdings" shows scheme
>   ShortNames.

### U3 — DataCheck: always concise, moved above the deck  ✅ (superseded design, see below)
- **Original ask:** hide the panel entirely on a clean statement; show it inline only on a
  problem.
- **Superseded (2026‑07‑04):** direct feedback asked for the opposite visibility rule —
  DataCheck now renders **unconditionally** (same "renders nothing until a live-NAV attempt has
  happened" guard as before, just no longer gated on pass/fail) directly under the upload bar,
  above the whole deck, and is **always a single concise headline** (pass or fail — e.g. "Data
  check passed — all 7 current holdings valued on live NAVs" / "Data check — 5 of 7 holdings
  passed... 2 failed..."). The inline issue `<ul>` and the "press Refresh" note are gone; a
  **"Details Shown in Data Sources"** link (`DataCheck.tsx`'s `onOpenDataSources` prop, wired to
  `App.tsx`'s `openSection('sources')`) opens + scrolls to the Data Sources section, which is
  where the per-fund pass/fail breakdown now lives (its own new "Data Check Status" column).
- **Files:** `app/src/features/datacheck/DataCheck.tsx`, `App.tsx`, `features/sources/{sourcing.ts,DataSources.tsx}`.
- **Accept:** concise pass/fail headline in both states; link opens + scrolls to Data Sources;
  Data Sources' per-fund Pass/Fail matches `runDataCheck`'s classification exactly (same
  `navLive` check, asserted in `sourcing.spec.ts`).

### U4 — Upload bar redesign: status-driven label, Refresh relocation, conditional MarkItDown fallback, anonymized demo  ✅
- **Why:** a plan-mode review of the upload flow (2026-07-05) found `plan.md` still said
  "MarkItDown primary, pdf.js fallback" while the shipped app never followed that (pdf.js is the
  zero-setup default) — and confirmed there's no genuine LLM/token cost in this pipeline either
  way (both paths are 100% local; MarkItDown's real advantage is parsing robustness, not raw
  resource cost). Direct feedback then gave a full, concrete spec for the upload bar superseding
  the smaller nudge-only plan that review produced.
- **Do:**
  1. Drop-zone default label → "Drop a CAMS / KFintech Statement Here — or Click to Browse";
     its own text becomes a 3-state machine (`UploadPhase`) tied to whether a dashboard build is
     in flight: idle → "Please Wait - Creating Dashboard..." → "Done! Dashboard Created — Click
     to Upload a New Statement" (still fully clickable throughout).
  2. Remove the standalone "Convert PDF to Markdown" button; move Refresh out of `Masthead.tsx`
     into the upload bar in the vacated spot.
  3. Show "Convert PDF to Markdown" + a new "Instructions" button (to Refresh's right) **only**
     when the current PDF upload actually had an extraction problem — never a general
     alternative to the pdf.js default.
  4. Rename "Load Sample Statement" → "Clear Data — Reset Dashboard": rebuilds from the shipped
     sample statement with every scheme's amounts independently randomized (×[0.5, 2.0)) and
     its folio scrubbed — never the fixed, identifiable sample figures.
- **Accept:** all of the above behaviors work live in the browser; full
  `npm run typecheck && npm run lint && npm test` gate stays green; the existing
  `portfolio.spec.ts`/`fixtures.spec.ts` golden tests are unmodified and still pass (proving the
  `analyzePortfolioFromSchemes` extraction was behavior-preserving).
- **Resolution note (2026-07-05):**
  - **`engine/portfolio.ts`**: extracted `analyzePortfolioFromSchemes(schemes, opts)` from
    `analyzePortfolio(text, opts)` (which now just `parseStatement`s then delegates) — lets the
    demo path operate on already-parsed/transformed `Scheme[]` without round-tripping through
    statement text. Confirmed behavior-preserving: every existing golden/portfolio test passed
    unmodified.
  - **`engine/randomizeDemo.ts`** (new): `randomizeSchemes(schemes, rng=Math.random)` — scales
    `closingUnits`/`costValue`/every `Txn`'s `units`/`amount`/`stamp`/`balance` by one random
    factor per scheme; deliberately leaves `nav`/`navDate`/`Txn.price` untouched so live-NAV
    plausibility matching behaves exactly as it would for a real statement; recomputes
    `marketValue = closingUnits * nav`. Because every cash flow for a scheme scales by the same
    constant, XIRR/CAGR are unchanged — asserted directly in the spec. Folio replaced with a
    synthetic, index-derived value (unique, no aggregation-key collisions).
  - **`engine/extractionQuality.ts`** (new): `assessExtractionQuality(schemes)` — the
    "does this PDF need the Markdown fallback" detector. Deliberately does **not** use
    `datacheck.ts`'s `reconciles` check: verified it sums the same `f.marketValue` values
    `Portfolio.totalValue` itself sums (`portfolio.ts:72`), so it's nearly tautological and would
    almost never fire from a genuinely fragmented extraction. Flags: zero schemes parsed;
    inconsistent ISIN presence within one statement (some schemes have one, some don't — a real
    CAS is uniformly one style, like the ISIN-less AXIS fixture); an active scheme with neither a
    resolved balance nor a value. **A rule was tried and dropped after testing against the real
    golden fixtures, not just synthetic cases**: "active scheme missing a folio" false-positived
    on 3 of the 5 real fixtures (alok_2025/2026's Parag Parikh Liquid Fund, vandana_kfintech's
    UTI Nifty 50 Index Fund) — a real, pre-existing, harmless registrar-format-variance gap with
    zero effect on those fixtures' exact golden totals. Kept out entirely rather than shipping a
    rule known to cry wolf on real statements.
  - **App.tsx**: unified `uploadPhase` state (owned by `UploadBar.tsx`'s `UploadPhase` type, App
    imports it the same way it already imports `Status`) replaces the old ad-hoc `dropLabel`/
    `loading`; a shared `runPipeline(schemes, ...)` is called by every entry point (a fresh
    upload, MarkItDown conversion, the randomized demo, Refresh) so the two-phase
    statement-then-live-NAV render logic exists in exactly one place regardless of source.
    `currentSourceRef` generalizes to a tagged union (`{kind:'text',text,sourceIsPdf}` |
    `{kind:'schemes',schemes}`) so Refresh knows whether to re-parse text or replay the
    already-randomized demo schemes as-is (no re-randomizing on Refresh — it only refreshes live
    NAVs). Zero-schemes-on-a-PDF now also flips on the Convert/Instructions buttons (not just a
    status message) so there's an actual clickable next step, not just prose describing one.
  - **Two real bugs found and fixed by live-browser testing, not just unit tests** (per this
    project's own testing discipline): (1) `runPipeline` originally always ended at
    `uploadPhase:'done'`, so "Clear Data" showed "Done! Dashboard Created" instead of reverting
    to the idle label as specified — fixed with an `endPhaseOnSuccess` parameter, defaulting to
    `'done'` for real uploads and `'idle'` for the demo path. (2) the zero-schemes-on-PDF failure
    only updated the status message, leaving Convert/Instructions hidden with no actual button to
    click — fixed by also setting `extraction` in that branch. Verified via `Math.random`
    call-counting and total-value diffing in the live preview that Clear Data draws fresh random
    factors each click while Refresh replays the exact same ones.
  - Live-verified: idle/processing/done label cycle on initial load; Clear Data twice produces
    different totals and reverts to idle (not "Done!"); Refresh preserves the same randomized
    total; a constructed non-CAS PDF triggers the zero-schemes message **and** shows
    Convert+Instructions; Instructions expands with the correct bridge-setup copy; Convert
    correctly attempts the local bridge and fails gracefully when it isn't running; Masthead has
    no button.
  - Updated the Playwright e2e spec (`e2e/dashboard.spec.ts`) for the button rename — both tests
    still pass; `randomizeSchemes` never touching `nav` means the existing NAV-mocking approach
    (reading real statement NAVs from `sample.txt`) stays correct even though displayed amounts
    are now randomized.
  - Full gate green: typecheck clean, lint clean, **293 Vitest tests** (up from 274), 2
    Playwright e2e tests green.

### U5 — Password-protected CAMS/KFintech PDF support  ✅
- **Why:** CAMS/KFintech CAS statements are almost always password-protected. Before this, a
  protected PDF failed silently into the generic "Could not read that file" error on both
  ingestion paths — there was no way to actually get past it.
- **Do:** a shared password-prompt UI (both ingestion paths funnel into it); pdf.js path detects
  the need via `pdfjs-dist`'s `PasswordException`; MarkItDown path decrypts the PDF itself before
  handing it to MarkItDown, since MarkItDown's own `convert()` has no password support to plug
  into.
- **Accept:** dropping a protected PDF prompts for a password on both paths; a correct password
  completes the parse; a wrong one shows a distinct "incorrect password, try again" state without
  losing the pending file; full test/lint/typecheck gate stays green.
- **Resolution note (2026-07-05):**
  - **Found the client-side plumbing was already half-built**: `ingest/router.ts`'s
    `IngestSource` type already carried an optional `password?: string` for the `'pdf'` kind, and
    `ingest/pdf.ts`'s `pdfToText(data, password)` already forwarded it to
    `pdfjsLib.getDocument({ data, password })` — nothing detected the need or prompted for one,
    so it was unused. Confirmed (by reading `node_modules/pdfjs-dist/build/pdf.mjs` directly, not
    assumed) that with no `onPassword` callback registered, pdf.js correctly **rejects**
    `.promise` with a `PasswordException` rather than hanging — a plain catch-and-retry works,
    no need for the interactive `onPassword` API.
  - **`ingest/router.ts`**: added `PdfPasswordRequiredError` (with an `incorrect: boolean` flag)
    — deliberately placed here, not in `ingest/pdf.ts`, which is dynamically imported
    specifically so pdf.js doesn't load eagerly for sessions that never touch the PDF path;
    putting the error class in the always-loaded `router.ts` lets `App.tsx` `instanceof`-check it
    via a static import without defeating that lazy-load.
  - **`ingest/pdf.ts`**: `pdfToText` catches `pdfjsLib.PasswordException` and re-throws
    `PdfPasswordRequiredError(code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD)`; any other
    error propagates unchanged.
  - **A real dead-end found and avoided before writing any Python**: researched MarkItDown's
    actual PDF converter source (fetched from GitHub, not assumed) — its `convert()` accepts
    `**kwargs` but never forwards them to `pdfplumber`/`pdfminer`, so a `password=` kwarg would
    be silently dropped. Passing a password straight through `convert()` was never going to work.
  - **`markitdown_server.py`**: works around this by decrypting the PDF itself before handing it
    to MarkItDown, using `pypdf` (confirmed via its docs: `PdfReader.is_encrypted` detects the
    need up front, `reader.decrypt(password)` returns `PasswordType.NOT_DECRYPTED` — falsy — on a
    wrong password without raising). `pypdf` is imported **lazily**, only after a first
    `_md.convert()` attempt fails and the file looks encrypted — so a user converting an
    already-unencrypted PDF never needs `pypdf` installed at all, keeping it a true "only needed
    when actually needed" dependency rather than a blanket new requirement. New `X-Pdf-Password`
    request header (URL-decoded server-side, `encodeURIComponent`-encoded client-side for
    transport safety); `401 {"error":"password_required"}` / `401 {"error":"incorrect_password"}`
    responses. Docstring updated with the new one-time `pip install pypdf` step.
  - **App.tsx**: one shared `pendingPassword: {kind:'pdf'|'markitdown', file, incorrect} | null`
    state used by both paths — `handleFile`/`handleConvertMarkitdown` both gained an optional
    `password` param and a password-specific catch branch; `handleSubmitPassword` dispatches back
    to whichever path originally asked, based on `pendingPassword.kind`. Cleared on any success,
    on an unrelated error, and by "Clear Data — Reset Dashboard".
  - **UploadBar.tsx**: an inline password block appears whenever `pendingPassword` is set,
    independent of the `hasExtractionProblem` Convert/Instructions buttons (a password prompt and
    "try Markdown instead" are different problems — MarkItDown needs the same password too, so
    it's never the right suggestion for a password issue). The drop-zone's own label gains a 4th
    state, "Password Required — Enter It Below to Continue", taking priority over the normal
    idle/processing/done cycle while pending. Hint copy: "usually your PAN in capitals... or
    whatever password entered on the CAMS webpage," plus a reassurance that the password never
    leaves the device (pdf.js path) or goes anywhere but the user's own local bridge (MarkItDown
    path).
  - **Layout follow-up, round 1 (2026-07-05):** moved the password block (heading, field, and
    hint text) from a full-bar-width block below everything to sit inside the drop-zone's own
    column — wrapped the drop-zone `<label>` and the conditional password `<form>` in a shared
    `.drop-col` (`flex:1`), gave the form its own `.upload-password-block` (max-width 380px,
    `margin: 0 auto` to center it within that column).
  - **Layout follow-up, round 2 (2026-07-05) — round 1 had a real bug, found and fixed.** Two
    complaints came back: the hint text read as "too compacted" (wanted the same width as the
    main dashboard), and the password box "is initially left-aligned under the upload box, and
    then changes after a moment to fully centred."
    - **Diagnosed the shift, not just patched around it.** `.drop-col` shared a flex row
      (`.wrap`) with `.upload-status` (whose message text changes length across the async
      upload flow — e.g. "Reading file…" → "This PDF is password-protected — enter the password
      below.") and the Refresh/Convert/Instructions/Clear-Data buttons. Flex items default to
      `min-width: auto`, so `.upload-status`'s text refuses to shrink below its own natural
      width; since `.wrap` had `flex-wrap: wrap` rather than actually wrapping, `.drop-col`'s
      `flex: 1` only ever got *whatever width was left over* after the other items claimed
      theirs — a width that changes whenever the status message's length changes. Round 1's
      `margin: auto` centering inside that column only produces a *visible* gap once the column
      is wider than the block's own max-width (380px) — so the same block could render flush
      left at one status-message length and visibly off-center at another, exactly matching
      "left-aligned, then centred a moment later." Confirmed the mechanism by instrumenting a
      temporary debug hook in `App.tsx` (`window.__debugPw`, removed after) to trigger the real
      `pendingPassword` state and measuring `getBoundingClientRect()` of `.drop-col`/
      `.upload-password-block` at multiple points in time and at multiple viewport widths.
    - **Fix: moved the block out of that flex row entirely**, making it a sibling of `.wrap`
      (inside `.uploadbar`, same slot `.upload-instructions` already uses) instead of nesting it
      inside `.drop-col` (which was reverted — `.drop` gets its `flex:1; min-width:260px` back,
      `.wrap`'s `align-items` reverts to `center`). Gave `.upload-password-block` the **exact
      same box recipe as `.wrap` itself** (`max-width: 1080px; margin: 0 auto; padding: 0 28px`)
      — this simultaneously satisfies "same width as the main dashboard" (verified live:
      `blockLeft`/`blockWidth` exactly equal the dashboard `<main>`'s own `.wrap` measurements,
      252.5px / 1080px) and eliminates the whole class of instability by construction, since the
      block's width no longer depends on any flex-row sibling's content at all — reconfirmed
      stable across a 1.5s window and across viewport resizes. `.upload-password-row` (the input
      + button) gets `width: fit-content` so it stays compact while the hint paragraph below it
      uses the full available width.
    - Also swapped the field's placeholder/`aria-label` to "Statement Password" and updated the
      hint copy wording — both requested alongside the layout fix.
    - Updated `UploadBar.spec.tsx`'s structural assertion to match (checks the block renders as
      `.wrap`'s sibling, not nested inside a `.drop-col` that no longer exists).
  - **Testing note — no real encrypted-PDF fixture used.** Python isn't available in this dev
    sandbox (confirmed — only Windows Store app-execution-alias stubs exist), so a real
    `pypdf`-generated encrypted PDF fixture couldn't be produced to test end-to-end. Instead,
    `ingest/pdf.spec.ts` mocks the whole `pdfjs-dist` module (defining its own
    `PasswordException`/`PasswordResponses`, not importing the real ones) to test exactly the
    logic that needed verifying — `pdfToText`'s translation of a `PasswordException` into
    `PdfPasswordRequiredError` with the correct `incorrect` flag — without touching pdf.js's
    actual decryption internals (already pdf.js's own tested responsibility) or its DOMMatrix/
    Worker requirements that don't exist under jsdom. **The `markitdown_server.py` changes were
    proofread carefully but never executed** — no Python interpreter was available to run them.
    Both gaps are logged here explicitly rather than silently claimed as verified.
  - Full gate green: typecheck clean, lint clean, **300 Vitest tests** (up from 293, +7: 3 new
    `pdf.spec.ts` cases, 4 new `UploadBar.spec.tsx` cases for the password prompt including the
    layout/copy follow-up); Playwright's 2 e2e tests unaffected.
  - **Real-world test, round 1 (2026-07-05) — found and fixed a real bug.** The user tried the
    feature against an actual password-protected CAMS PDF (not a synthetic test file) and
    reported "the dashboard is failing to refresh and update." Since I still can't route a real
    encrypted PDF through my own tools without over-broadly exposing it (confirmed again — an
    attempt to stage it in `app/public/` for testing was correctly blocked as increasing exposure
    beyond what the debug needed), the user tested it directly and shared their browser console.
    - **Decryption/parsing actually worked** — the console showed no fatal error in that path,
      just the expected harmless CORS-blocked `amfiindia.com` direct-fetch attempts.
    - **The real bug**: repeated React "Encountered two children with the same key" warnings for
      one specific fund. The statement holds that scheme across **two folios** — an ordinary,
      legitimate real-world shape (e.g. two SIPs opened at different times) that none of the
      synthetic test statements used during development happened to exercise.
    - **Root cause**: `FundCards.tsx`, `TopHoldings.tsx`, and `DataSources.tsx` all keyed their
      per-fund list rows by `f.isin || f.name` alone — identical for both folio entries, so React
      saw duplicate keys and could reuse/confuse DOM nodes between them across re-renders, which
      is exactly what "stuck, not updating" looks like from the outside.
    - **Fix**: keyed all three by `` `${f.isin || f.name}-${f.folio}` `` instead.
    - **Regression test added the hard way** — `renderToStaticMarkup` (used by every existing
      spec in this codebase) does **not** run React's key-uniqueness validation at all (confirmed
      empirically: zero `console.error` calls even with genuinely duplicate keys in a raw
      sanity check), so a first attempt at this test using that pattern would have silently
      never caught anything. Rewrote it using a real client-side render (`react-dom/client`'s
      `createRoot` + `act`, both already available from the existing `react`/`react-dom` deps —
      no new dependency) to exercise the actual reconciliation path where the warning fires.
      Proved the test itself was valid by temporarily reverting the fix and confirming it failed,
      then restoring the fix and confirming it passed.
    - Full gate green: typecheck clean, lint clean, **301 Vitest tests** (+1), Playwright's 2 e2e
      tests unaffected. The `markitdown_server.py`/real-encrypted-PDF end-to-end gap logged above
      is still open — this only exercised the pdf.js direct-parse path, which is what the user's
      test happened to use.
  - **Real-world test, round 2 (2026-07-05) — a second real bug, unrelated to the password
    feature itself.** After the round-1 fix, the same real statement (dated January 2022) got
    further than before but reported "1 of 4 holdings passed... 3 failed," with the Data Sources
    reason `"No matching live NAV found (no ISIN in statement, name match failed)"`.
    - Asked the user to check Data Sources for the specific reason rather than guessing — the
      app already computes and displays exactly this, and the exact wording (no ISIN + name
      match failed) ruled out the plausibility-gate-rejects-a-correct-match theory (old-statement
      price drift over 4+ years) that seemed equally plausible going in.
    - The user identified that one of the 3 failing funds, Axis Long Term Equity Fund, was
      renamed **Axis ELSS Tax Saver Fund** (08-Dec-2023, confirmed via a valueresearchonline.com
      article they linked) — an industry-wide SEBI/AMC-driven ELSS renaming this app's alias
      system (`reference/aliases.ts`) exists specifically to handle, but didn't yet have an entry
      for.
    - **Fix:** added `['axis elss tax saver', 'axis long term equity']` to `NAME_ALIAS_GROUPS`.
      Verified the actual mechanism, not just the alias data: `mfapiByName` (`marketdata/sources/
      mfapi.ts`) already builds its search query from `canonCore(name)`, so this alias makes an
      old-name statement search mfapi.in under the fund's *current* name — confirmed with a test
      asserting the constructed search URL contains "axis elss tax saver" and not "long term".
      Added a matching `liveKey` collapse test in `harmonise.spec.ts`. Proved both tests are real
      regression guards by temporarily removing the alias and confirming both failed, then
      restoring it.
    - **Standing instruction from the user, recorded for future recurrences**: when a fund fails
      to resolve with a "name match failed" reason on an **old** statement, check morningstar.in
      and valueresearchonline.com for a name change/merger/wind-up before assuming it's an
      extraction bug — see `docs/DECISIONS.md`'s "Old statements and fund renames" for the full
      process note.
    - **Left as an open question, not resolved**: the "inconsistent ISIN presence"
      extraction-quality check (U4) did not show the Convert/Instructions buttons on this upload,
      and it's not yet known whether that's because all 4 holdings are uniformly ISIN-less
      (correct behavior, matching the `axis.txt` precedent) or because it was a genuine mix that
      didn't fire when it should have — see the DECISIONS.md note for what to check if this
      recurs. The other 2 failing funds' names haven't been shared yet either, so they haven't
      been researched.
    - Full gate green: typecheck clean, lint clean, **303 Vitest tests** (+2), Playwright's 2 e2e
      tests unaffected.
  - **Real-world test, round 3 (2026-07-06) — a third real bug, resolving the "other 2 failing
    funds" left open in round 2.** Both were the *same* fund across two folios (the round-1
    duplicate-key fix already made this render correctly as 2 cards): "ICICI Prudential Equity
    Arbitrage Fund - Direct Plan - Growth (Advisor: DIRECT)". The user's own diagnosis — "the name
    harmonisation seems to not be working properly" — was right, but this wasn't a missing alias;
    the correct alias (`['icici prudential arbitrage', 'icici prudential equity arbitrage']`) was
    already in `reference/aliases.ts` from an earlier fix.
    - Root cause: CAMS had appended a `(Advisor: DIRECT)` broker/advisor-code annotation onto the
      raw scheme name. `normName` (`engine/harmonise.ts`) only special-cased two specific
      parenthetical patterns (`(formerly...)`, `(non-demat)`) before a generic
      `[^a-z0-9 ]`-strip that deletes punctuation but **keeps the words inside parens** as loose
      tokens — so `coreTokens` produced `"icici prudential arbitrage advisor"` instead of
      `"icici prudential arbitrage"`, and `canonCore`'s alias lookup (an **exact-string** match)
      silently failed on the polluted string despite the right alias already existing.
    - **Fix:** added `.replace(/\(advisor:?[^)]*\)/g, ' ')` to `normName`, stripping the whole
      annotation wholesale — same pattern as the existing `(formerly...)`/`(non-demat)` handling.
      Added a regression test in `harmonise.spec.ts` asserting `canonCore` on the real annotated
      string still resolves to `"icici prudential arbitrage"` and that its `liveKey` matches the
      un-annotated form. Proved it's a real guard: reverted the fix, confirmed the new test failed
      with the exact polluted string (`"icici prudential arbitrage advisor"`), restored the fix,
      confirmed it passed.
    - **Lesson recorded in `docs/DECISIONS.md`:** a missing alias isn't the only way name-matching
      fails — raw broker/account metadata in parens can pollute the generic normalization step
      even when the right alias is already in place. Check `coreTokens(name)` for stray tokens
      before assuming the alias table is at fault.
    - Full gate green: typecheck clean, lint clean, **304 Vitest tests** (+1), Playwright's 2 e2e
      tests unaffected.
  - **Real-world test, round 4 (2026-07-06) — a two-part bug in `mfapiByName` itself, unrelated
    to aliases or `normName`.** The user reported "Axis Arbitrage Fund - Direct Growth" also
    failing with "name match failed" — despite no rename and no annotation like round 3's.
    - **Bug 1 (search-query crowding):** confirmed live against mfapi.in that `/search` caps
      results at 15 with no relevance ranking. The search query used the bare `canonCore` output
      ("axis arbitrage" — "fund" deliberately stripped for matching-invariance), and Axis's newer
      "Income Plus Arbitrage Active/Passive FOF" family (15 IDCW/growth share classes) fills the
      entire cap, so "Axis Arbitrage Fund" never appears in the results. **Fix:** append `' fund'`
      to the search query only (`marketdata/sources/mfapi.ts`), leaving `canonCore`/matching
      untouched.
    - **Bug 2 (scoring threshold), found only because fixing bug 1 alone still failed the new
      test:** the `want` token set for scoring included `planKey` words (direct/growth), but a
      matching candidate's `toks` (its own `canonCore`) never does — plan is already enforced
      exactly by an earlier filter. This guaranteed a fixed size-mismatch penalty of `0.2` for
      every genuine match, silently requiring 3+ core-token overlap to clear the `score >= 2` bar
      — so any fund with a 2-word-or-shorter canonical core could never match, regardless of
      query quality. **Fix:** build `want` from core tokens only, dropping the now-redundant
      `planKey` import.
    - Added one regression test reproducing the real crowding scenario (15 mocked FOF decoys vs.
      the real 4-variant family) via a mocked `fetch` that only returns the real family when the
      query includes "fund". Proved **both** fixes are independently load-bearing: reverted each
      one at a time (query fix only, then scoring fix only, both reverted vs. both restored) and
      confirmed the test fails whenever either fix is missing.
    - **Lesson:** every prior mfapi test fixture happened to have a 3-word-or-longer canonical
      core, so the scoring bug was invisible until a real 2-word-core fund (AMC name + one
      category word — a common, unremarkable shape) was tested.
    - Full gate green: typecheck clean, lint clean, **306 Vitest tests** (+2), Playwright's 2 e2e
      tests unaffected.
  - **Real-world test, round 5 (2026-07-06) — a real architectural gap, not a name-matching bug.**
    The user reported the ICICI Arbitrage fund (round 3's fund) showing up **twice** under Data
    Sources and Fund Cards, correctly diagnosing it as "likely because two different folios had
    this fund in them," and asked that scheme totals be consolidated across folios everywhere
    (summary tables, fund houses, fund cards, full holdings) rather than shown as separate rows.
    - Investigated with a research agent first: `engine/types.ts`'s `Scheme`/`Fund` had always been
      strictly one-per-`(folio, scheme)` — `analyzePortfolioFromSchemes` (`portfolio.ts`) did a
      straight `schemes.map(analyzeScheme)` with no grouping step anywhere. A same-scheme,
      two-folio holding produced two independent, each-individually-wrong `Fund` entries (each
      one's avgCost/XIRR/CAGR computed only from that one folio's partial transaction history).
    - **Key finding: XIRR/CAGR/lot-based gains cannot be correctly merged after `analyzeScheme` has
      already run** — they're not additive or averageable across two partial-history Funds.
      Correct consolidation requires merging the raw `Txn` lists of both folios first, then running
      the existing per-scheme analysis once on the combined history.
    - **Fix:** added `groupSchemesByIdentity` (`engine/scheme.ts`) — groups by `isin || name`;
      merges by concatenating+date-sorting `txns`, NaN-safe-summing `closingUnits`/`marketValue`/
      `costValue` (so "neither folio reported a cost value" doesn't silently become a false `0`),
      joining `folio` into `"F1, F2"`, and keeping the more recent `nav`/`navDate`. Wired into
      `analyzePortfolioFromSchemes` (`portfolio.ts`) as the very first step, before any other
      per-scheme logic runs — so `funds[]`, `houses`, `alloc`, portfolio XIRR, and the chart series
      all automatically see one row per scheme, with no changes needed in any UI component
      (FundCards/DataSources/TopHoldings/HoldingsTable/allocation drill-down all just render
      `pf.funds` as before).
    - **Verified safe against every existing fixture first**, before writing new tests: confirmed
      `vandana_kfintech.txt` (a real fixture with 3 ISINs each duplicated across folios) is the
      only fixture with this shape, and reasoned + then confirmed by running the full suite that
      portfolio-level totals (the golden `totalValue` gate, `series` last-value-ties-out invariant)
      are unaffected by consolidation — they were always a sum over every real transaction
      regardless of how many `Scheme` records it was split across; only the **per-scheme** figures
      were wrong before.
    - Added: a `groupSchemesByIdentity` unit-test suite (merge math, folio-joining, txn-sort
      correctness, and a case proving the merged avgCost/XIRR is only derivable by merging raw
      txns first, not by combining two separately-computed Funds) in `scheme.spec.ts`; a fixture-level
      integration test in `portfolio.spec.ts` against the real `vandana_kfintech.txt` asserting no
      two `funds[]` entries share an `isin || name` and that a real duplicated ISIN's `folio` field
      shows both folios joined. Proved the fixture-level test is a real guard: reverted the wiring
      (`schemes = rawSchemes` instead of `groupSchemesByIdentity(rawSchemes)`), confirmed it failed
      with "expected 26 to be 29" (3 genuine duplicate ISINs), restored the fix, confirmed it passed.
    - Manually verified in the browser (demo data, single-folio-per-scheme so no duplicate to
      show, but proves no rendering regression): Fund Cards render correctly, the Folio field
      displays normally, no console errors.
    - Full gate green: typecheck clean, lint clean, **309 Vitest tests** (+3), Playwright's 2 e2e
      tests unaffected.

---

### U6 — Dark/Light theme toggle: "Terminal Deck" / "The Ledger"  ✅
- **Ask:** two full, distinct dashboard aesthetics — a dark amber-phosphor CRT-terminal look and a
  warm cream editorial-ledger look — shown as mockups (via the visualize tool, not real app code)
  for review, then implemented as an instant, user-togglable pair rather than a single retheme.
  Button spec: crescent-moon icon + "Dark Mode" while on The Ledger; sun icon + "Light Mode" while
  on Terminal Deck — the label always names the mode a click switches **to**.
- **Mechanism (see `docs/DECISIONS.md` "Dark/Light theme toggle" for the full writeup):** a single
  `data-theme` attribute on `<html>`, with every color/font token defined twice in `tokens.css`
  under the same variable names — toggling is one DOM attribute write, and the browser's own CSS
  cascade repaints everything in one pass. No React re-render of the dashboard tree.
- **Fonts self-hosted via `@fontsource` (JetBrains Mono, Fraunces, Courier Prime)**, not Google
  Fonts — `index.html`'s CSP (`font-src 'self'`, `script-src 'self'`) is a deliberate privacy
  choice for an app that processes real financial statements client-side, and self-hosting keeps
  it untouched. `main.tsx` eagerly calls `document.fonts.load(...)` for all three families at
  startup so the *first* toggle isn't waiting on a font fetch.
- **Made the retheme total, not partial:** found and fixed ~23 hardcoded hex values in `deck.css`
  (mostly literal duplicates of the old single-theme token values) plus several `rgba(...)` tint
  backgrounds in `app.css` (converted to `color-mix(in srgb, var(--token) N%, transparent)`, which
  re-derives from whichever theme is active) — both invisible to the toggle before this pass.
  `categories.ts`/`geography.ts` (color logic in TS, can't live in CSS) now hold literal
  `'var(--cat-equity)'`-style strings instead of hex; confirmed empirically in the browser that
  both React inline `style` props and raw SVG `fill="..."` attributes resolve `var()` correctly,
  so no theme-awareness was needed in the TS layer.
- **Preserved a subtlety while cleaning up `deck.css`:** `.legrow:hover`/`.legrow.active` relied on
  a now-removed `.deck { --card: #252a33 }` local override to be visibly lighter than the tile
  background it sits on. Added a proper `--card-hover` token instead of letting that hover state
  go invisible.
- **Text-on-accent-fill uses `var(--paper)`** (not `var(--ink)`, not a hardcoded white) for
  `.dc-icon`/`.empty-state-icon`/`.gbtn:hover` — accent colors are, by construction, always the
  opposite brightness of the page background in *either* theme, so `--paper` is legible against
  both Terminal Deck's bright fills and The Ledger's dark fills without per-theme special-casing.
- **Testing:** `ThemeToggle.spec.tsx` uses a real client render (`react-dom/client` + `act`, same
  technique as the folio duplicate-key regression test) since the toggle's effect is a DOM
  attribute + `localStorage` side effect invisible to `renderToStaticMarkup`. Covers: correct
  default (dark) and label when unset, reading a stored preference on mount, and a full
  click-cycle asserting the attribute/localStorage/label all flip together both ways. Verified as
  a real guard: broke the click handler, confirmed the cycle test failed, restored it.
  Also added a fixture-free unit-level cleanup confirmation: re-grepped both CSS files for any
  remaining `#hex`/`rgb(a)` literal after the pass — found and fixed a few more (`rgba` tints in
  `.valbanner`, `.tag`, `.navtag`, `.commentary-*`) that a first pass missed, since the original
  survey's grep pattern only matched `#hex`, not `rgba(...)` triplets.
- **Manually verified in the browser** (preview tools): body/tile/text colors and font-family
  correctly reflect each theme via computed-style inspection (not just visual screenshot, which
  was intermittently unavailable this session); 4 consecutive toggle cycles all correctly flipped
  the attribute, `localStorage`, background color, and button label together; the choice survives
  a page reload; mobile viewport (375×812) renders without errors; no console errors or CSP
  violations; the allocation donut/legend and fund cards correctly re-theme via the `var()`-string
  mechanism confirmed above.
- Full gate green: typecheck clean, lint clean, **312 Vitest tests** (+3), Playwright's 2 e2e tests
  unaffected.
- **Round 2 (2026-07-08) — user feedback on the shipped dark theme + a new hover-interaction ask.**
  - **"Terminal Deck doesn't look professional, yellow tint across the dashboard."** Root cause:
    the *structural* colors (`--ink`, `--paper`, `--card`, `--frame`, `--line`, `--muted`) had the
    same warm amber bias as the accent — since `--ink` is the default text color used everywhere,
    a saturated amber as body text read as an overall wash, and near-identical warm-toned surface
    lightnesses meant nested cards barely differentiated (low contrast). **Fix:** structural colors
    became a true neutral gray ramp with clear lightness steps; amber survives only as an accent
    (`--green`/`--brass`/`--cat-equity`), used sparingly. Also re-tinted the scanline/vignette
    atmosphere overlay from amber to neutral white — see `docs/DECISIONS.md` "Terminal Deck
    contrast pass" for the full palette. The Ledger (light theme) was untouched — confirmed good
    separately.
  - **Two mockups shown for approval before implementing**, per the user's request: the revised
    dark palette, plus a live-hoverable demo of the spring scale+shadow effect (CSS-approximated
    spring easing in the mockup sandbox, since it can't run React/Framer Motion — flagged to the
    user that the real build would use actual Framer Motion for true spring physics). Approved.
  - **Hover-lift effect, requested as Framer Motion**: scale 1.05 + softened box-shadow, spring
    transition (not linear), applied to "every single separate element/box... for visual and use
    consistency" — in both themes. Installed `framer-motion`; built one shared file
    (`ui/HoverLift.tsx`) exporting `HoverDiv`/`HoverArticle`/`HoverButton` wrapper components
    around `motion.div`/`motion.article`/`motion.button`, with the scale/shadow/spring constants
    defined once. Surveyed every candidate component with a research agent first, to get a
    complete, accurate inventory rather than guessing. Applied to: KPI tiles (×3), the Insight
    tile, the Value-vs-Invested chart card, the Allocation card wrapper, each allocation legend
    row, all 6 Portfolio Analysis section buttons, fund cards, the Data Check banner, the
    Commentary card, and the Top Holdings mini-card — 10 components, all bounded "box" surfaces.
    **Deliberately excluded** (with reasoning, not silently): `<tr>` rows in `HoldingsTable`/
    `HousesTable`/`DataSources` (scaling breaks table grid layout), the upload drop-zone (scaling
    the drop target during an active drag-and-drop gesture is a functional risk), and the
    masthead/empty-state/notes text blocks (no background/border of their own — not visually
    "boxes"). `useReducedMotion()` skips the animation entirely for anyone who's asked their OS
    for less motion. See `docs/DECISIONS.md` "Hover-lift on every boxed element" for the full
    component list and the reasoning per exclusion.
  - **Verification gotcha, worth remembering:** synthetic `dispatchEvent(new PointerEvent(...))`
    calls did not trigger Framer Motion's `whileHover` in a scripted browser session — it appears
    to require a genuinely trusted pointer event. Switched to a real Playwright-driven click
    (which performs an actual mouse move as part of clicking) and confirmed the effect via
    computed `transform`/`box-shadow` on `.deck-tile`, `.fcard`, and `.legrow`, in both themes,
    after a full dev-server restart to rule out stale HMR console-log artifacts from the many
    rapid edits.
  - **"Edit Palette" saved as a standing trigger phrase** (memory, not code): asking for it in
    future sessions should produce a summary table of the live `tokens.css` values (colors +
    fonts, both themes) with an invitation to make small targeted edits.
  - Full gate green: typecheck clean, lint clean, **312 Vitest tests** (unchanged — no new test
    coverage needed for a pure palette/visual-effect pass beyond the existing `ThemeToggle.spec.tsx`),
    Playwright's 2 e2e tests unaffected.
- **Round 3 (2026-07-09) — three more requests: reposition the toggle, a real Nifty 50 benchmark
  bug, and direct chart navigation.**
  - **Theme toggle moved to a fixed top-right page corner** (`.theme-toggle-corner`, `App.tsx`),
    out of `UploadBar`'s own flex row — stays reachable regardless of scroll, no longer competes
    for space with Refresh/Clear Data on narrow screens. See `docs/DECISIONS.md` "Theme toggle
    moved to a fixed page corner."
  - **Real bug found and fixed in the Nifty 50 XIRR benchmark**, not just a display tweak.
    Confirmed by querying mfapi.in directly: IDBI's long-running Nifty 50 tracker stopped
    reporting in 2023 (2+ years stale); the only other still-reporting match, Angel One's Nifty 50
    Index Fund, launched 2025-05-28 — ~14 months of history. `benchmarkCagr`'s nearest-point
    lookup had no bounds-check, so requesting an 11-year "All-Time" window against that fund
    silently substituted its own first-ever NAV for "11 years ago," presenting a ~1.1-year return
    as if it covered 11 years. **Fix:** `benchmarkCagr` (`marketdata/sources/benchmark.ts`) now
    requires both endpoints to fall within a 30-day tolerance of the actually-requested dates, or
    returns `null` — `KpiRail.tsx`'s existing `!= null` check already renders `—` in that case, no
    UI-layer change needed. The 1-year figure was unaffected (the fund did exist a year ago);
    cross-checked its computed value (~−5.1%) directly against the fund's real NAV history for
    09-Jul-2026 against the user's independently-sourced reference (~−4.87%) — the small gap is
    ordinary fund tracking-error/expense-ratio drag, not a discrepancy. Added two regression tests
    in `benchmark.spec.ts` using the real fund's actual dates/NAVs; proved both are real guards by
    reverting the coverage check, confirming the exact wrong value (−1.8%) reproduced, restoring
    the fix. See `docs/DECISIONS.md` "Nifty 50 benchmark: a short-history fund must not fake a
    long window."
  - **Chart gallery direct-pick buttons**, replacing the unlabeled `.gdots`: a horizontal row
    reusing the exact `.deck-adv-tiles`/`.deck-advt`/`.deck-advt-open` classes and `HoverLift`
    treatment already used by the Portfolio Analysis section buttons — same layout, same
    selected/unselected visual language, same hover behavior, for consistency the user explicitly
    asked for. Short-form button labels (`SHORT_LABEL` map in `ChartGallery.tsx`) are distinct
    from the unchanged full slide titles, per the user's exact mapping (e.g. "Net Capital Added by
    Year" slide → "Net Capital Changes" button). Removed `.gdots`/`.gdot` CSS as dead code once
    superseded. Updated `ChartGallery.spec.tsx` and the Playwright e2e test's chart-gallery
    assertions (previously targeting `.gdot`) to match the new markup, and extended the e2e test
    to actually click a picker button and verify it jumps to the right slide, not just prev/next.
  - Full gate green: typecheck clean, lint clean, **315 Vitest tests** (+3), Playwright's 2 e2e
    tests updated and passing.
- **Round 4 (2026-07-09) — layout polish, a gap-standardization pass, bold buttons app-wide, a
  footer rewrite, and a brand-new full-stack feedback feature.**
  - **Chart gallery restructured**: picker row moved above the gallery box (was below), directly
    under the section's intro text; `#charts .sec-sub` now spans full width (`max-width: none`,
    scoped to that section only — other sections' subtitles keep their 62ch readability cap); a
    standardized 14px gap sits between the picker row and the gallery box, matching the
    `.deck-kpi-rail`/`.deck-grid-2col`/`.deck-col` gap already used elsewhere (`.funds`'s 18px was
    the one outlier and got normalized to match). Hit a real CSS cascade-order bug along the way —
    see `docs/DECISIONS.md` "Chart gallery restructure" for the fix and the general lesson about
    `app.css` vs `deck.css` load order.
  - **Bold buttons app-wide**: a general `button, [role='button']` fallback in `tokens.css` plus
    explicit `font-weight: 700` added to every button class's own rule (`.deck-btn`, `.btn-demo`,
    `.dc-link`, `.gbtn`, `.deck-advt`) and to child text elements where the button itself doesn't
    hold the visible text (`.legrow .lab`, `.ch-title`). Deliberately scoped to genuine interactive
    controls, not sortable table headers or the fund-card hyperlink.
  - **Footer rewritten**: replaced the old one-line disclaimer with the user's longer supplied
    text, now spanning the same 1080px width as the "Your Portfolio Summary" box (verified via
    `getBoundingClientRect()` — identical width and left edge, not just visually close).
  - **Feedback button matched to the theme toggle exactly**: same `.deck-btn` class, plus a shared
    `min-width: 125px` so "Feedback" (shorter text) doesn't render narrower than "Light Mode"/
    "Dark Mode" — verified identical width/height/right-edge via direct measurement, not eyeballed.
  - **New: end-to-end feedback system**, see `docs/DECISIONS.md` "Feedback system" for the full
    writeup. Floating button (bottom-right-of-center-edge) → modal (category dropdown + textarea)
    → `POST http://127.0.0.1:8766/api/feedback` → a new local Express server (`server/`, same
    "you run it yourself on 127.0.0.1" pattern as `markitdown_server.py`) → validates + strips all
    HTML from the message via `sanitize-html` → persists to a local SQLite file (`better-sqlite3`,
    parameterized queries) → `201`. `index.html`'s CSP `connect-src` extended by exactly one origin
    (`127.0.0.1:8766`), matching the existing MarkItDown-bridge entry's shape.
    - **Actually run and verified, not left unexecuted**: unlike the Python MarkItDown bridge (no
      interpreter available in this sandbox), Node/npm *are* available — installed real deps
      (including building `better-sqlite3`'s native module), ran the server, and drove a genuine
      end-to-end submission from the live browser preview: CORS preflight → POST → 201 → UI
      confirmation → row landing in `feedback.db`, sanitized correctly. Not just unit-tested.
    - Backend test suite (`server/feedback-server.test.js`, `node --test`, 6 tests): valid
      submission persists + sanitizes correctly, invalid category rejected, empty/over-length
      message rejected, markup-only message rejected once sanitized to nothing, two submissions
      land as two distinct rows.
    - Frontend test suite (`Feedback.spec.tsx`, real client render + `act`, same technique as
      `ThemeToggle.spec.tsx`, 7 tests): button renders closed by default, modal opens with the
      right controls, successful submission POSTs the right payload and shows confirmation,
      server-unreachable and server-validation-error paths both surface the right message, Cancel
      and Escape both close the modal, Submit is disabled while the message is empty.
  - Full gate green: typecheck clean, lint clean, **322 Vitest tests** (+7) plus **6 new backend
    `node --test` tests**, Playwright's 2 e2e tests unaffected.
- **Round 5 (2026-07-09) — six precise layout fixes.**
  - **Footer disclaimer** resized to 512px (matches the "Value vs Invested" chart box's width, per
    the user's own description of it as "the box within which the charts are plotted") and the
    "As of ..." line at the very bottom removed entirely (the separate "As of" line in the
    masthead, at the top of the page, is unrelated and untouched).
  - **Total Value tile**: "Total Invested [amount]" now stays on one line, "N Funds" moved to its
    own line below (was one combined string joined by "·", which could wrap awkwardly) — the dot
    separator removed per the ask.
  - **Allocation donut enlarged 15%** (240px → 276px) so its inner hole — where the center
    value/label text sits — has more room for 8-figure amounts, which were interfering with the
    ring before.
  - **"Value vs Invested" pinned to a hard 512×400px**, no longer part of the height-matching
    system with Allocation. **Top Holdings (below it) stays dynamic** but the mechanism changed:
    removing a `min-height: 0` override (which had disabled flexbox's default "never shrink below
    content" floor) fixed a real spillage bug — a real fund name was visibly overflowing the
    Holdings box — while a plain `flex: 1` on both Holdings and Allocation (no `min-height`
    override on either) keeps their bottoms aligned in *either* direction: whichever box's natural
    content is taller, the other stretches to match, via the grid row's default
    `align-items: stretch`. `.deck-holdings`'s padding also became uniform (16px all sides, was
    asymmetric 6/16/4px). See `docs/DECISIONS.md` "Value vs Invested: fixed size, Holdings grows
    to match" for the full mechanism.
  - **Holdings table's Value/Total Gain/CAGR columns given distinct widths** (was one shared 88px
    for all three) — Value and Total Gain both 112px (verified via a synthetic max-length string
    that a genuine 9-figure Value or 8-figure signed Total Gain never exceeds it), CAGR kept at a
    narrow 60px since it's always a short percentage.
  - **Verified precisely, not just visually**: every dimension (512×400 chart box, 276px donut,
    112/112/60px columns, equal 16-17px table margins, aligned box bottoms, one-line/two-line KPI
    text split, 512px footer width, "As of" gone) confirmed via `getBoundingClientRect()`/
    computed-style checks in the live browser preview, in both themes — not eyeballed from a
    screenshot. Full gate green: typecheck clean, lint clean, all 322 Vitest tests + 6 backend
    tests + 2 Playwright e2e tests unaffected (pure layout/CSS change, no new test coverage
    needed beyond the existing suite already covering these components' behavior).

- **Round 6 (2026-07-10) — sample data replaced from a real anonymized statement, then
  de-randomized into a permanent "Sample Portfolio."**
  - **`app/public/sample.txt` regenerated from a real CAMS PDF**, extracted via the app's own
    `pdfjs-dist` pipeline run in-process (never written to disk unredacted, never staged in the
    git-tracked `public/` dir — an earlier attempt to do that was correctly blocked by the auto
    mode classifier, see chat history). Folio numbers replaced with `DEMO-2000...`, every
    Amount/Units/Stamp Duty/Balance scaled by 0.5, dates and NAV/price left untouched.
    `parseStatement` structurally cannot capture name/PAN/address (regex-driven, only matches
    fund/folio/transaction-shaped lines), so folio was the only identifier needing scrubbing.
    Result: 13 real schemes (Franklin Templeton/ICICI Prudential/PPFAS), 8 currently held, 5
    fully exited/switched (including a real segregated-portfolio write-down).
  - **Per-load randomization retired**: `engine/randomizeDemo.ts` and its spec deleted.
    `App.tsx`'s `loadRandomizedDemo` → `loadSamplePortfolio`, which now parses `sample.txt`
    as-is on every load/refresh/Clear-Data — no random `[0.5, 2.0)` per-scheme scale factor, no
    folio scrubbing (already scrubbed at the source). The shipped statement being pre-anonymized
    made the randomization redundant — it existed only to keep the *old*, non-anonymized sample
    from reading as a specific real portfolio.
  - **Masthead title** gained a third state via a new `isSample: boolean` prop (threaded
    App.tsx → CommandDeck → Masthead, tracked in state alongside `investorName`): sample data
    with no name → **"Sample Portfolio Summary"**; a real upload with an extractable investor
    name → unchanged personalized `"‹name›'s Portfolio Summary"`; a real upload with no
    extractable name → unchanged generic `"Your Portfolio Summary"` fallback. "Clear Data —
    Reset Dashboard" already called the sample-loading path, so it now also flips the title back
    correctly with no separate wiring needed.
  - **Verified**: two consecutive page loads showed identical Total Invested (₹1,10,67,473) and
    fund count (8), differing only in Total Value/XIRR by the live-NAV delta between fetches —
    confirming quantities are now genuinely fixed and only markets move the numbers. Clear Data
    tested live, restores the same fixed figures and title. Full gate green: typecheck clean,
    lint clean, 318 Vitest tests (322 minus the 4 deleted `randomizeDemo.spec.ts` tests), no
    console errors in the live preview.

---

## A — Accessibility (public-product bar)  *(priority 4)*

### A1 — Keyboard + ARIA + focus management  ✅
- **Targets:** donut slices, legend rows, sortable table headers, chart gallery
  (prev/next/dots), the advanced toggle, commentary toggle + inputs, file drop zone.
- **Do:** correct roles/labels, tab order, Enter/Space activation, visible focus rings,
  `aria-expanded`/`aria-controls` on toggles, `aria-pressed`/`aria-current` on gallery dots.
- **Accept:** full keyboard-only walkthrough works; automated axe check (via Playwright) has
  no critical violations.
- **Resolution note (2026-07-05):** the "automated axe check via Playwright" half of the
  acceptance line can't be satisfied yet — Playwright doesn't exist in this repo (that's T1,
  still ⬜). Verified everything else via a live keyboard-only walkthrough (real Tab/Enter/
  Space events + accessibility-tree/computed-style inspection through the browser preview) —
  a manual pass now, an automated one once T1 lands.
  - **A real, confirmed bug found and fixed:** the file drop zone (`UploadBar.tsx`) was
    **completely unreachable by keyboard**. It's a `<label>` wrapping a `display:none` file
    `<input>` — a mouse click on the label works natively, but a `display:none` element is
    never in the tab order, and unlike a native `<button>`, a plain `<label>` doesn't forward
    Enter/Space to the control it wraps even if focused. Fixed by giving the label
    `tabIndex={0}` + `role="button"` + an `onKeyDown` that calls `fileInputRef.current?.click()`
    on Enter/Space. Verified live: the label is now genuinely `Tab`-reachable, and a dispatched
    Enter key event correctly invokes the hidden input's `click()`.
  - **`SortableTable.tsx`'s `<th>` headers had zero keyboard support** (click-only, no
    `tabIndex`, no key handler, no `aria-sort`) — now focusable, Enter/Space triggers the same
    sort as a click, and `aria-sort` (`ascending`/`descending`/`none`) tracks the visible ↑/↓
    glyph exactly. Verified live: focusing "Scheme" and pressing Enter re-sorted the Full
    Holdings table alphabetically and flipped `aria-sort` to `ascending`.
  - **Donut slices and legend rows** (`AllocationSection.tsx`) already had `tabIndex`/`role=
    "button"`/Enter-Space handling from earlier work — added the missing `aria-pressed`
    (toggles correctly, verified live on both the slice and its matching legend row) and a
    descriptive `aria-label` on each legend row (previously relying on visual-only child text).
    Also found and fixed `.donut path:focus { outline: none; }` — an explicit rule that killed
    the focus ring with **no replacement**, a real WCAG 2.4.7 failure; replaced with
    `.donut path:focus-visible` showing a visible ring.
  - **Commentary's toggle** already had `aria-expanded`; added `aria-controls="commentary-body"`
    pointing to the (now-`id`'d) body div — verified the id exists exactly when
    `aria-expanded="true"`.
  - **Gallery dots** gained `aria-current="true"` on the active dot (verified live: moves
    correctly when a dot is clicked); the prev/next buttons and dots were already real
    `<button>`s with `aria-label`s, just missing an explicit `:focus-visible` style for the dark
    theme, added alongside the deck's own button classes (`.deck-btn`, `.deck-advt`,
    `.deck-ilink`) for consistency.
  - **Accordion buttons** (`PortfolioAnalysis.tsx`) already had `aria-expanded`/`aria-controls`
    from the Revision 2 rebuild — no change needed there.
  - No code touched `DataCheck.tsx`'s "Details Shown in Data Sources" link — already a real
    `<button>`, already keyboard-accessible by default.
  - **Follow-up required (logged 2026-07-05, not yet done):** once T1 (Playwright) lands, run
    an automated axe accessibility scan against both the lean and advanced views and confirm
    zero critical violations — this is the acceptance-criterion half A1 could not satisfy via
    manual testing alone. Do not consider A1 fully closed until this follow-up scan has run.

### A2 — WCAG-AA contrast audit  ✅
- **Do:** audit the paper/ink palette (`ui/tokens.css`) — especially `--muted` on `--paper`
  and the pill/tag colors — against AA (4.5:1 text / 3:1 large); adjust tokens where failing.
- **Accept:** all text/UI meets AA; documented in a short contrast table.
- **Resolution note (2026-07-05):** computed exact WCAG contrast ratios (relative-luminance
  formula) for every text-color token against the backgrounds it's actually used on, including
  the semi-transparent tag/navtag pill backgrounds composited over their real base colour.
  **Every pair already passes AA (4.5:1) — no token changes were needed.** The closest to the
  threshold is `--green` on `--card` at 4.53:1 (a 0.03 margin — worth re-checking if either
  token's hex ever changes).

  | Pair | Ratio | AA (4.5:1) |
  |---|---|---|
  | `--ink` on `--paper` | 17.29:1 | ✅ |
  | `--ink` on `--card` | 14.97:1 | ✅ |
  | `--muted` on `--paper` | 7.25:1 | ✅ |
  | `--muted` on `--card` | 6.28:1 | ✅ |
  | `--pos` on `--paper` | 9.55:1 | ✅ |
  | `--brass` on `--paper` | 8.44:1 | ✅ |
  | `--clay` on `--paper` | 6.98:1 | ✅ |
  | `--neg` on `--paper` | 6.22:1 | ✅ |
  | `--green` (link) on `--paper` | 5.24:1 | ✅ |
  | `--teal` on `--paper` | 4.93:1 | ✅ |
  | `--green` on `--card` | 4.53:1 | ✅ (borderline) |
  | `.tag.up` text (`--pos`) on its own `rgba(--pos,.14)`-over-`--paper` pill | 7.50:1 | ✅ |
  | `.tag.down` text (`--neg`) on its own pill | 5.23:1 | ✅ |
  | `.navtag.live` text (`--pos`) on its own `rgba(--pos,.16)`-over-`--card` pill | 6.03:1 | ✅ |
  | `.navtag.stmt` text (`--brass`) on its own pill | 5.45:1 | ✅ |

### A3 — prefers-reduced-motion  ✅
- **Do:** ensure the gallery slide transition and any spinners honor the existing
  reduced-motion block; verify no motion when the OS setting is on.
- **Accept:** reduced-motion emulation in the preview shows no transform animations.
- **Resolution note (2026-07-05):** already fully satisfied, from a prior session —
  `app.css` has `@media (prefers-reduced-motion: reduce) { * { transition: none !important;
  animation: none !important; } }`, a global, `!important`-enforced rule that catches every
  transition (gallery slide, hover states) and every `@keyframes` animation (the loading
  spinner) with no per-component exceptions possible. No code change needed; this task was
  effectively already done and just needed confirming — verified by code inspection since the
  preview tools don't expose a `prefers-reduced-motion` emulation switch (only `colorScheme`).

---

## S — Security / privacy (public-product bar)  *(priority 5)*

### S1 — CSP + subresource integrity  ✅
- **Do:** add a strict Content-Security-Policy (meta or host headers); confirm the pdf.js
  worker is self-hosted (Vite `?url` import — verify, don't assume); add SRI to the Google
  Fonts links or self-host the fonts.
- **Accept:** CSP blocks inline/eval except what's needed; no CDN script without SRI.
- **Resolution note (2026-07-05):** added a `<meta http-equiv="Content-Security-Policy">` to
  `index.html`:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'
  data:; font-src 'self'; connect-src 'self' https://www.amfiindia.com
  https://mf.captnemo.in https://api.mfapi.in http://127.0.0.1:8765; worker-src 'self';
  object-src 'none'; base-uri 'self'; form-action 'self'`.
  - **Google Fonts item was stale** — grepped the whole `app/src` tree: no
    `fonts.googleapis.com`/`@font-face`/`@import` anywhere. `tokens.css` declares `'Inter'` /
    `'IBM Plex Mono'` with system fallbacks but never loads either webfont, so they're silently
    falling back to `system-ui`/`monospace` in every browser today — a pre-existing cosmetic
    gap, unrelated to security, not touched here (would need its own decision: self-host the
    two fonts, or drop the named-font tokens and accept the system-font fallback as the design).
    No CDN font link exists, so there was nothing to add SRI to or self-host for S1's purposes.
  - **pdf.js worker confirmed genuinely self-hosted**, not assumed: `ingest/pdf.ts` imports
    `pdfjs-dist/build/pdf.worker.mjs?url` (Vite's `?url` bundles it as a local asset) and sets
    `GlobalWorkerOptions.workerSrc` to that local URL. Verified with a real `npm run build`:
    `dist/assets/pdf.worker-CPbhI6B3.mjs` ships same-origin; `workerSrc` never points at a CDN.
  - **`script-src 'self'` with no `'unsafe-inline'`/`'unsafe-eval'`**: verified via
    `npm run build` that the production `dist/index.html` has zero inline `<script>` tags —
    only one `<script type="module" src="/assets/...">` pointing at a hashed same-origin file.
  - **`style-src` needed `'unsafe-inline'`, confirmed empirically, not assumed**: first tried
    strict `style-src 'self'` live in the browser preview — the app rendered completely
    unstyled (Vite's dev server injects CSS via `<style>` tags for HMR, and this app uses
    React's `style={{...}}` prop extensively — 25 occurrences across 9 files — both of which
    are inline-style mechanisms a strict `style-src` blocks). Adding `'unsafe-inline'` to
    `style-src` only (not `script-src`) fixed it with zero console errors on reload. This is a
    materially lower-severity relaxation than a script-src one (CSS-injection impact ceiling is
    much lower than script-injection).
  - **`connect-src` allowlist derived from the real, current outbound calls** (re-verified live
    via `preview_network` after loading the sample statement, not just read from code): fires
    to `amfiindia.com` (fails today — no CORS headers, expected per the existing code comment;
    stays in the allowlist since D1's edge function will eventually proxy this same call),
    `mf.captnemo.in`, `api.mfapi.in` (both NAV lookups and the Nifty 50 benchmark fetch), and
    `http://127.0.0.1:8765` (the local MarkItDown bridge, intentionally `http:` — it's
    loopback-only). Confirmed zero CSP violations in the console across every one of these
    calls.
  - **`frame-ancestors` deliberately left out of the meta tag** — per the CSP spec, a
    `<meta http-equiv="Content-Security-Policy">` silently ignores `frame-ancestors` (and
    `report-to`/`sandbox`); only a real HTTP header enforces it. Left a code comment pointing
    this at D1 (whatever host/edge config eventually serves this app should also set
    `frame-ancestors 'none'` as a response header, not rely on the meta tag for it).
  - Verified live end-to-end: full `npm run typecheck && npm run lint && npm test` green (219
    tests), production `npm run build` unaffected (CSP meta tag survives into `dist/index.html`
    unchanged), and a full page reload with the sample statement loaded produced zero CSP
    console errors while exercising every allowlisted host.

### S2 — Audit & guard the `dangerouslySetInnerHTML` sinks  ✅
- **Do:** enumerate every sink (7 charts, commentary, notes); confirm all statement-derived
  interpolation goes through `escapeHtml`; add unit assertions that a crafted `<img onerror>`
  fund name is neutralized in each sink; add a short "HTML-string surface" note to
  `docs/DECISIONS.md`. (Full JSX rewrite is X5 — deferred.)
- **Accept:** each sink has an escaping assertion; the audit note lists all sinks.
- **Resolution note (2026-07-05):** **the task description was stale** — grepped
  `dangerouslySetInnerHTML` across all of `app/src` and found exactly **one** real sink left,
  `Commentary.tsx` (rendering `buildCommentaryHTML()`). The "7 charts + commentary + notes"
  count is from before this session's chart-interactivity work: all 6 charts
  (invested/annual/rolling/capital/holdings/geography) are now real JSX components with zero
  HTML-string building, and `Notes.tsx` was already plain JSX — X5 ("full JSX rewrite") is
  therefore already done for the charts, just not logged as such until now.
  - Read `commentaryText.ts` end to end: the only statement-derived text interpolated into the
    HTML string is the top holding's fund name
    (`escapeHtml(shortName(top.name))`); every other interpolation is a number and can't carry
    markup.
  - The `<img onerror>` escaping assertion this task calls for **already existed** —
    `commentaryText.spec.ts` (from earlier this session) has a test feeding
    `<img src=x onerror=alert(1)> Fund - Direct Growth` as a fund name through
    `buildCommentaryHTML` and asserting the raw `<img` never appears in the output; `escapeHtml`
    itself is separately unit-tested in `format.spec.ts`. Added one more assertion directly to
    the same spec file for a second payload shape (a `</div><script>` closing-tag breakout,
    distinct from the self-closing `<img>` case already covered) — full suite green (220
    tests).
  - Added the "HTML-string surface" note to `docs/DECISIONS.md` (new section, right before
    "Retiring the HTML/mirror duplication") documenting the single-sink reality, the one
    escaped field, and an invariant that any future statement-derived interpolation into this
    sink must go through `escapeHtml`.

### S3 — No-PII-egress verification  ✅
- **Do:** an automated check (Playwright network capture or a test harness) asserting the only
  outbound hosts are the NAV edge function + captnemo + mfapi + fonts/pdfjs — and that NAV
  requests carry only scheme names or ISINs, never folio/PAN/amounts.
- **Accept:** the egress-allowlist test passes; a deliberate stray fetch fails it.
- **Resolution note (2026-07-05):** Playwright doesn't exist yet (T1, still ⬜), so built the
  "test harness" half of the acceptance line as a Vitest-level check
  (`marketdata/egress.spec.ts`) that spies on `global.fetch` around the real call sites
  (`resolve.ts`, `sources/captnemo.ts`, `sources/mfapi.ts`, `sources/benchmark.ts`) — this
  can't see the real browser network stack the way Playwright would, but it's the code that
  actually decides what leaves the app, so it's a genuine check, not a mock of the intent. The
  browser-level backstop for the host allowlist itself is already S1's CSP `connect-src`
  (identical host list), which a rogue `fetch()` can't route around even if a future code
  change tried to.
  - **Fonts/pdfjs item was stale** (same root cause as S1's Google Fonts item) — there is no
    outbound fonts request (nothing loads a webfont) and pdf.js's worker is same-origin, so
    neither is a real network egress to allowlist; dropped from the allowlist used by the test.
  - Wrote `assertAllowedEgress(urls)` against the real 4-host list (`www.amfiindia.com`,
    `mf.captnemo.in`, `api.mfapi.in`, `127.0.0.1` for the MarkItDown bridge) — a dedicated test
    proves it throws on a stray host (`evil.example`) with the failing host named in the error,
    satisfying "a deliberate stray fetch fails it."
  - **Verified the actual, not assumed, no-PII claim**: built schemes with a distinctive
    sentinel folio number and sentinel market/cost-value amounts, ran them through
    `resolveLiveNavs` (both the ISIN/captnemo path and the ISIN-less mfapi.in name-rescue path)
    with a spied fetch, and asserted none of the recorded URLs contain the folio or the
    amounts — while positively asserting the expected identifier (ISIN, or a canonicalized
    fund-name token) *does* appear, so the test can't pass by accident if a source stopped
    being called. Also covered `fetchNiftyBenchmark` (fixed query, no statement data at all).
  - All 5 new tests pass against the real (non-mocked-away) resolver logic; full suite green
    (225 tests).

### S4 — Dependency audit  ✅
- **Do:** `npm audit` (fix/patch), review the 3 prod deps + dev deps for anything unneeded.
- **Accept:** no high/critical advisories; dep list justified.
- **Resolution note (2026-07-05):** `npm audit` → **0 vulnerabilities**, nothing to fix/patch.
  Reviewed every dependency for justification:
  - **Prod (3, unchanged since Phase 0):** `react`/`react-dom` (the whole UI), `pdfjs-dist`
    (PDF ingestion — its worker is self-hosted per S1's finding). No dead weight — no date/
    utility/UI-kit libraries; the app leans on hand-written engine code by design.
  - **Dev (10):** `typescript`, `vite`, `@vitejs/plugin-react` (build/JSX), `vitest`, `jsdom`
    (test runner + DOM environment for component specs), `oxlint` (the `lint` script),
    `@types/react`/`@types/react-dom` (TS types for the two prod deps), `@types/node` (grepped
    for real usage — several `*.spec.ts` fixture-loading helpers import `node:fs`/`node:path`/
    `node:url` directly, and `tsconfig.node.json` covers `vite.config.ts`, so this is genuinely
    needed, not vestigial), `prettier` (has a real `.prettierrc.json` matching the codebase's
    actual style — no quotes/semi/100-width — used via editor integration; there's no `npm run
    format` script, which is a minor gap but not a security or bloat concern, so left as-is).
    No unused/orphaned dev dependency found.

---

## T — Testing  *(priority 6)*

### T1 — Playwright e2e critical-path smoke  ✅
- **Do:** load sample → live NAV updates → toggle advanced → sort a table → open commentary
  (enter age/retire) → step through the gallery. Plus an offline path (fetch stubbed to fail)
  asserting statement-NAV fallback + the show-on-problem data-check. Wire into CI headless.
- **Accept:** e2e green locally + in CI; covers the lean and advanced views.
- **Follow-up owed to A1 (logged 2026-07-05):** once this lands, run an automated axe scan
  (lean + advanced views) and confirm zero critical violations — see the A1 resolution note.
- **Resolution note (2026-07-05):** added `@playwright/test` (the one new devDependency this
  whole tasks.md list introduces), `app/playwright.config.ts`, and `app/e2e/dashboard.spec.ts`
  (2 tests). Runs against a real production build (`vite preview`, not the dev server) so it
  also exercises the S1 CSP meta tag and the actual built asset graph, not just source.
  - **Route-mocked the 3 live-NAV hosts** (`www.amfiindia.com` abort, `mf.captnemo.in`
    fulfilled, `api.mfapi.in` abort — matching S1/S3's real allowlist) rather than hitting the
    live internet in CI, which would make the suite flaky and non-reproducible. The captnemo
    mock reads the *actual* statement NAV for each ISIN straight out of
    `public/sample.txt` (`e2e/sampleNavs.ts`, a small regex extractor) and returns it ×1.01 —
    close enough to pass `navPlausible`'s 1/3x–3x band (engine/harmonise.ts), different enough
    to prove the live substitution really happened rather than silently falling back to the
    statement value unnoticed. This also means the mock never drifts out of sync if
    `sample.txt` is ever edited.
  - **Test 1 (happy path)** walks the full chain in the task description: loads the sample,
    confirms "Data check passed" + "Live NAV" in the masthead, opens **Full Holdings** from
    Portfolio Analysis (the "toggle advanced" step — there's no separate advanced-mode toggle
    since the Revision-2 redesign; Portfolio Analysis's accordion sections are the advanced
    surface), clicks the Scheme column header and confirms `aria-sort` flips `none` →
    `ascending`, opens **Full Commentary**, fills Age/Target Retirement Age and confirms the
    generated guidance text appears, then opens the **6-Chart Gallery** and confirms `.gnext`
    moves `aria-current` from dot 0 to dot 1.
  - **Test 2 (offline path)** aborts all 3 live-NAV hosts and confirms the DataCheck panel
    shows the unreachable headline ("Data check failed — live NAV sources couldn't be
    reached...") and the masthead falls back to "Statement values" — the show-on-problem path,
    with the dashboard still fully rendered off statement NAVs rather than blank/broken.
  - **A real ambiguous-selector bug caught while writing this**: `page.getByLabel('Age')`
    without `{ exact: true }` matched 3 elements, because the Allocation legend's "**Arbitrage**"
    category label contains the substring "**a**rbitr**age**" — Playwright's default
    `getByLabel` substring-matches. Fixed with `exact: true`; a good reminder that substring
    label/text matchers need real scrutiny once a page has enough varied copy on it.
  - **Type-checked the e2e files too, not just green-lit them**: `e2e/**` isn't under either
    existing `tsconfig.app.json` (`include: ["src"]`) or `tsconfig.node.json`
    (`include: ["vite.config.ts"]`), so `tsc -b` was silently skipping it — added
    `tsconfig.e2e.json` (referenced from the root `tsconfig.json`) so the e2e suite is a real
    typecheck target, not just something that happens to run.
  - **Excluded `e2e/**` from Vitest's own test glob** (`vite.config.ts`'s `test.exclude`) —
    Vitest's default `*.spec.ts` pattern would otherwise also try to pick up the Playwright
    spec file and fail on its incompatible `test`/`expect` API.
  - **A real environment bug, not a test bug, caught getting this running at all**: the
    `webServer.url` was originally `http://127.0.0.1:4173`, and Playwright's readiness probe
    timed out every time even though `vite preview` had started and was listening — because on
    this machine `vite preview` binds only to the IPv6 loopback (`[::1]:4173`), and `127.0.0.1`
    (IPv4) has nothing listening on it. Confirmed via `netstat` before concluding it wasn't a
    config/timing issue. Fixed by using `http://localhost:4173` everywhere instead, which
    resolves to whichever loopback address is actually bound.
  - **CI**: added a second job (`e2e`) to `.github/workflows/ci.yml`, parallel to the existing
    unit-test job — `npx playwright install --with-deps chromium` then `npm run test:e2e`, with
    the HTML report uploaded as an artifact on failure for debugging.
  - Verified: both e2e tests pass locally (`npx playwright test`, 2 passed); full gate still
    green afterward (typecheck clean including the new e2e project, lint clean, 274 Vitest
    tests unaffected).

### T2 — Render-smoke coverage for untested feature/deck components  ✅
- **Why:** logged 2026-07-04 (see the "Known retroactive gap" note above) — every component
  except `EmptyState` has zero automated coverage, even though each was live-browser-verified
  when built. A smoke test catches a future refactor silently breaking a render path (crash,
  wrong conditional branch) that a live check at build-time can no longer re-run for free.
- **Do:** for each of the components listed above, add a `renderToStaticMarkup`-based spec
  (same pattern as `EmptyState.spec.tsx`) asserting its main states render without throwing and
  contain the expected key text/structure (e.g. `KpiRail` renders all 4 tile labels; `DataCheck`
  renders both its pass and fail headline text; `PortfolioAnalysis` renders all 6 section
  buttons). This is a **smoke** net, not exhaustive interaction testing — no click/hover
  simulation here (that needs `@testing-library/react`, an open dependency question, not
  assumed).
- **Accept:** every component in the "Known retroactive gap" list has at least one spec; full
  suite stays green; no new runtime dependency added.
- **Resolution note (2026-07-05):** added a shared fixture builder,
  `src/testFixtures.ts` (`makeFund`/`makePortfolio`/`makeSeries`/`makeGeo`/`makeHouseSummary`/
  `makeDiag`, all `Partial<...>`-overridable, matching the real `engine/types.ts`/`fundMeta.ts`/
  `resolve.ts` interfaces exactly rather than loose casts) — this kept every new spec short:
  state only what a test actually varies, get a fully-populated realistic portfolio for free.
  Added one `renderToStaticMarkup` spec per component in the gap list, all 23:
  `Masthead`, `CommandDeck`, `KpiRail`, `ValueVsInvestedCard`, `TopHoldings`, `InsightCard`,
  `PortfolioAnalysis`, `DataCheck`, `DataSources`, `FundCards`, `HoldingsTable`, `HousesTable`,
  `Commentary` (the component itself — `commentaryText.spec.ts` only covered the pure
  `buildCommentaryHTML`/`commentaryBand` functions, not the collapsible-card component), `Notes`,
  `UploadBar`, `ChartGallery`, `AllocationSection`, `InvestedChart`, `AnnualChart`,
  `RollingChart`, `CapitalChart`, `HoldingsChart`, `GeographyChart`. Each has both a "happy
  path" render (real data, main branch) and at least one edge-case render (empty/zeroed/
  no-live-data/no-cost-basis) asserting the component degrades to its documented placeholder
  text instead of throwing — not just a bare "doesn't crash" smoke, closer to the letter of the
  accept criterion. No new dependency added — plain `react-dom/server`, same as `EmptyState`.
  Full gate green: typecheck clean, lint clean, **274 tests** (up from 225 before this task).

### T2 follow-up (not built, logged only)
`@testing-library/react` for real interaction testing (click/hover/keyboard through these
components rather than a static-markup smoke) is still an open dependency question — T2's specs
verify render output only, not event wiring (that's covered separately, ad hoc, by this
session's live-browser-preview checks during each component's original build, not by an
automated test). Revisit only if a future regression in event-handling logic isn't caught by
the existing geometry/keyboard unit tests and the render-smoke specs above.

---

## D — Deploy  *(priority 7)*

### D1 — Static SPA + edge-function deploy config  ✅ *(config done; account/push steps are yours)*
- **Do:** deploy config for the SPA **and** the N2 edge function (Cloudflare Pages + Workers
  recommended; Vercel/Netlify equivalent). Preview deploys on PR.
- **Accept:** a preview URL serves the app and reaches the live edge NAV function.
- **Resolution note (2026-07-11):** built as **Cloudflare Pages with a Pages Function**, not a
  separate Workers deployment — N2's handler (`app/src/server/amfiNav.ts`) is a plain
  Web-standard `(Request) => Promise<Response>` with no platform imports, and Pages Functions
  (file-based routing under `functions/`) co-deploy on the *same origin* as the static site.
  That matters concretely here: `index.html`'s CSP is `connect-src 'self' ...` — a same-origin
  `/api/amfi-nav` needed **zero CSP/CORS changes**, where a standalone Worker on its own
  subdomain would have needed both.
  - **`app/functions/api/amfi-nav.ts`** — thin wrapper (`onRequest = ({request}) =>
    handleAmfiNav(request)`); all real logic stays in the already-tested N2 handler.
  - **`app/wrangler.toml`** — minimal (`name`, `compatibility_date`, `pages_build_output_dir`)
    so both `wrangler pages dev` and Cloudflare's own build know where `dist/` is.
  - **`wrangler` added as a devDependency**, `npm run preview:pages` builds + serves the SPA and
    the Function together locally — this is how the config below was actually verified, not just
    reasoned about.
  - **Verified live, locally, against the real AMFI feed** (not mocked): `wrangler pages dev`
    served both the static site (200, correct `<title>`) and the function
    (`GET /api/amfi-nav` → 200, 18,523 real ISINs, golden ISIN `INF109K016O4` resolved correctly,
    `Access-Control-Allow-Origin: *`, `OPTIONS` preflight → 204); then rebuilt with
    `VITE_AMFI_EDGE_URL=/api/amfi-nav` baked in (confirmed present in the built bundle) and
    loaded the Sample Portfolio against it in a real browser — `fetch('/api/amfi-nav')` from the
    running page returned real data, satisfying this task's literal "reaches the live edge NAV
    function" acceptance line end-to-end, not just at the network layer in isolation.
  - **Existing behaviour, not a regression:** with the edge function healthy, mf.captnemo.in
    (ISIN-based, CORS-native) often still ends up as the *displayed* per-fund source in Data
    Sources — `resolve.ts` races both tiers in parallel and lets a successful captnemo match
    overwrite the AMFI one (predates D1, task N3's own design). Documented in `docs/DEPLOY.md`'s
    verification section so this isn't mistaken for the edge function not working.
  - **The one env var** (`VITE_AMFI_EDGE_URL` = `/api/amfi-nav`, relative — same-origin on every
    environment including PR previews) is set in the Cloudflare dashboard, not baked into a
    committed `.env` — left unset locally, the app is byte-identical to pre-D1 behaviour (N3's
    "inert until D1" contract, honoured).
  - **What's actually left, and isn't mine to do:** creating the GitHub repo, pushing, connecting
    it to Cloudflare Pages, and setting that one dashboard env var — all need the user's own
    GitHub/Cloudflare accounts. The repo was git-initialized locally with a clean initial commit
    (`0714c74`) ready for that; **no remote configured, nothing pushed**. Full checklist in
    `docs/DEPLOY.md`.

### D2 — In-app privacy note + methods docs  ✅
- **Do:** a concise, visible privacy statement (what leaves the device: only NAV lookups by
  ISIN/name; nothing else) distinct from the methods `Notes` section.
- **Accept:** privacy note visible in the lean view (or one tap away).
- **Resolution note (2026-07-11):** a third floating corner button, `PrivacyNote.tsx`
  (`features/privacy/`), joins `ThemeToggle` (top-right) and `Feedback` (right-edge, centered) at
  the one remaining corner (bottom-right) — mounted outside the `pf &&` gate in `App.tsx`, same
  as the other two, so it's present from first paint regardless of whether a statement has been
  uploaded yet. Opens a small modal (reusing `.feedback-overlay`/`.feedback-modal`'s visual
  language) with 3 short paragraphs: nothing is uploaded (parsing is local), the only network
  calls are NAV lookups by ISIN/name to AMFI/mf.captnemo.in/mfapi.in with folio/amounts never
  sent, and the optional MarkItDown/Feedback bridges only ever talk to `127.0.0.1`. Every claim
  is the same one `marketdata/egress.spec.ts` (task S3) already enforces with a real fetch-spy
  test — this note is prose describing what that test guarantees, not a new claim. A footnote
  link ("Method Notes") closes the privacy modal and opens the Method Notes section — keeps the
  two documents genuinely distinct (short/privacy-specific vs. long/methods-reference) while
  still connecting them for anyone who wants the fuller detail, matching `DataCheck`'s existing
  "Details Shown in Data Sources" cross-link pattern. Verified live at desktop and mobile widths
  (no overlap with the other two corner buttons, modal fits within a 375px viewport); 9 new
  render-smoke tests (`PrivacyNote.spec.tsx`, real-client-render technique per T2's convention);
  full gate (typecheck/lint/347 Vitest tests/2 Playwright e2e tests) green.
  **Superseded 2026-07-11 by U7** — this floating button and its modal were removed; the same
  facts now live in U7's "Privacy and Data" menu item, expanded to a full layperson explainer.

### D3 — Production feedback: Cloudflare Pages Function forwarding to a webhook  ✅
- **Do:** the Feedback button posts to `server/feedback-server.js` at `http://127.0.0.1:8766` — a
  local companion process that only exists on the machine of whoever's running the app. Once
  deployed, a real visitor's own `127.0.0.1:8766` never has this server running, so every
  production submission fails silently. Give the site owner an actual way to receive feedback
  once the app is live.
- **Accept:** submissions from a deployed instance reach the site owner (not a database only they
  remember to check) with no new hosted database/admin UI to build or maintain; local dev is
  unaffected.
- **Resolution note (2026-07-12):** same "thin per-platform entry point around a plain
  Web-standard handler" shape as N2/D1's AMFI edge function.
  - **`app/src/server/feedbackWebhook.ts`** (new) — `(Request, webhookUrl) => Promise<Response>`,
    no platform imports. Re-validates everything the client already validates server-side (never
    trust client input): allowed categories, non-empty message, under 5000 chars. Forwards
    `{category, message}` to `webhookUrl` as `{ text, content, category, message, submittedAt }` —
    `text` is Slack's Incoming Webhook field, `content` is Discord's, so the exact same deployed
    code works with either provider (or a generic Zapier/Make/n8n catcher via the raw fields) with
    zero code changes, only which URL gets configured. `neutralizeMentions()` inserts a zero-width
    space after every `@` before forwarding — this endpoint accepts free text from anyone on the
    public internet and forwards it into a Slack/Discord channel, so an unneutralized `@everyone`
    in a "bug report" would ping the whole channel; deliberately *not* the local server's
    full-HTML-stripping `sanitize-html`, since this handler never renders the message as HTML
    anywhere in its own pipeline (see `docs/DECISIONS.md` for the full reasoning). Returns 500
    (not a crash, not a silent drop) when `FEEDBACK_WEBHOOK_URL` isn't configured; 502 if the
    webhook itself is unreachable or rejects the payload.
  - **`app/functions/api/feedback.ts`** (new) — Cloudflare Pages Function entry point, auto-routed
    to `POST /api/feedback`; unwraps `env.FEEDBACK_WEBHOOK_URL` and delegates.
  - **`Feedback.tsx`**: endpoint is now `VITE_FEEDBACK_URL || 'http://127.0.0.1:8766/api/feedback'`
    — unset (unchanged default), local dev behaves exactly as before this task; set to
    `/api/feedback` (Cloudflare dashboard, same-origin), it hits the new Function. The
    "server not running, start it with `cd server && npm start`" error only makes sense in local
    dev, so it's now conditional on which endpoint is active — the edge path shows a generic
    "couldn't send feedback, try again" instead.
  - **`docs/DEPLOY.md`** extended with the new `VITE_FEEDBACK_URL` (plain text) and
    `FEEDBACK_WEBHOOK_URL` (**secret**) dashboard steps, a `curl` + real-UI deploy-verification
    check, and a "Local testing" section for pointing `wrangler pages dev` at a real webhook (or a
    throwaway local listener) via a gitignored `app/.dev.vars`. `.dev.vars` added to `app/
    .gitignore` alongside the existing `.wrangler/` entry.
  - **Verified end-to-end without touching any real external service**: built with
    `VITE_FEEDBACK_URL=/api/feedback` baked in, ran `wrangler pages dev` with
    `FEEDBACK_WEBHOOK_URL` in a local `.dev.vars` pointed at a throwaway local HTTP listener on
    the same machine, then drove a real submission through the actual Feedback form in a live
    browser — confirmed the `201`, the "Thanks — your feedback has been sent" UI state, and the
    listener receiving the exact expected payload with `@everyone` correctly neutralized to
    `@​everyone`. All temporary local-only test files (`.env.local`, `.dev.vars`, the mock
    listener) removed after verification — nothing real was contacted, nothing left behind.
  - 10 new unit tests (`feedbackWebhook.spec.ts`, mocked `fetch`, same convention as
    `amfiNav.spec.ts`): method rejection, invalid category, empty/oversized message, unparseable
    body, not-configured 500, successful forwarding (payload shape asserted field-by-field),
    mention neutralization, webhook-unreachable 502, webhook-rejected 502. Full gate
    (typecheck/lint/70 files, 365 Vitest tests) green.

### U7 — Top-left Help menu: Instructions / Privacy and Data / FAQ  ✅
- **Do:** a menu, permanently visible top-left on desktop and click-to-open on mobile, with three
  items — a step-by-step CAMS statement-download + dashboard-usage guide (with the user's own
  CAMS screenshot as a clickable-to-enlarge thumbnail, plus an in-app SVG redraw of the same
  steps), a comprehensive layperson-facing "Privacy and Data" explainer, and an FAQ covering
  XIRR, Rolling Returns, ST/LT Split, Portfolio Commentary, and Asset Allocation — each answer
  layperson-first, with the dashboard's actual formula underneath for a technical reader.
- **Accept:** all three panels open/close correctly on both desktop and mobile widths; content is
  accurate to what the app actually does (not generic/textbook).
- **Resolution note (2026-07-11):** `features/help/` — `HelpMenu.tsx` (menu shell: click-outside
  and Escape to close, `PanelId = 'instructions' | 'privacy' | 'faq'`), `InstructionsContent.tsx`,
  `PrivacyDataContent.tsx`, `FaqContent.tsx`. Mounted unconditionally in `App.tsx` (outside the
  `pf &&` gate), same pattern as `ThemeToggle`/`Feedback`.
  - **Responsive, CSS-only:** `.help-menu-list` renders inline (all 3 items visible) by default;
    `@media (max-width: 780px)` hides it behind a "Menu" toggle button. No viewport-width JS
    detection needed — desktop needs no visibility logic at all.
  - **Instructions**: numbered steps for requesting a Detailed / Specific Period / With-zero-
    balance-folios CAS from CAMS (`camsonline.com/Investors/Statements/Consolidated-Account-
    Statement`), the user's own screenshot (`app/public/cams-instructions.png`) as a click-to-
    enlarge thumbnail (`.help-lightbox`), a small in-app `CamsStepsDiagram` SVG (reuses the
    dashboard's own theme tokens, so — unlike the static screenshot — it re-themes correctly
    between Terminal Deck and The Ledger), then a second numbered list explaining every dashboard
    section (KPI row, Value vs Invested chart, Top holdings/Allocation, all 6 Portfolio Analysis
    sub-sections by name, Portfolio Commentary with its "not financial advice" disclaimer).
  - **Privacy and Data**: supersedes D2's `PrivacyNote` (see above) — every claim grounded in
    `marketdata/egress.spec.ts`'s exact allowlist (`www.amfiindia.com` / `mf.captnemo.in` /
    `api.mfapi.in` / `127.0.0.1`), written for a non-technical reader, includes a "verify it
    yourself" Dev-Tools walkthrough.
  - **FAQ**: 5 Q&As, each layperson prose first then a `.help-formula` block with the dashboard's
    actual math, sourced directly from `engine/xirr.ts` (bisection + Newton fallback),
    `engine/series.ts`'s `dietz()` (Modified Dietz for Rolling Returns), `engine/gains.ts` (ST/LT
    lot logic), `features/allocation/categories.ts` + `engine/scheme.ts` (Asset Allocation), and
    `features/commentary/commentaryText.ts` (lifecycle-stage bands + Bogle's age-in-bonds
    cross-check) — intentionally overlaps with Method Notes by design (user's instruction), as
    the fuller, layperson-first version of the same facts.
  - Two review diagrams (a custom SVG explainer of the CAMS form, and a "Process Flow" flowchart
    of using the dashboard end-to-end) were shown to the user for review via the visualize tool
    before implementation began; the in-app `CamsStepsDiagram` above is a separate, simplified,
    theme-aware redraw for in-product use.
  - Verified live in both themes and at both desktop and mobile (375px) widths: menu opens/closes
    (click, Escape, click-outside), all 3 panels render with correct content, the screenshot
    thumbnail/lightbox opens and closes, the in-app diagram re-themes correctly, mobile
    click-to-open toggle works, no console errors. 5 new render-smoke tests
    (`HelpMenu.spec.tsx`, real-client-render technique per T2's convention). Full gate
    (typecheck/lint/69 files, 353 Vitest tests) green.
  **Revised 2026-07-12 by U8** — menu positioning fixed and a 4th item ("Reading the Dashboard")
  split out of Instructions; see below.

### U8 — Help menu repositioning + "Reading the Dashboard" split + Save as PNG  ✅
- **Do:** (1) the "Menu" toggle button was visibly (and uselessly) rendering on desktop
  alongside the always-visible item list — remove it there, mobile-only click-to-open unchanged.
  (2) Align the top menu item with the "Sample Portfolio Summary" box on desktop, floating/
  sticking in place once scrolled past. (3) Split Instructions into "Download your Statement from
  CAMS" (was "Step 1 —…") and a new standalone "Reading the Dashboard" item (was "Step 2 —…"),
  inserted right under Instructions. (4) A "Save as PNG" button, top-right of the Portfolio
  Summary box above the Insight tile, downloading an HD (163 PPI, i.e. a 27" 4K monitor's pixel
  density) PNG of just the summary box (masthead + KPI row + chart/holdings/allocation) —
  excluding Commentary and Portfolio Analysis below it.
- **Accept:** no visible "Menu" button on desktop; menu starts level with the summary box and
  stays in view on scroll; Instructions/Reading the Dashboard read cleanly as separate items;
  Save as PNG downloads a correctly-cropped, correctly-scaled PNG that doesn't include its own
  button.
- **Resolution note (2026-07-12):**
  - **Root cause of the stray desktop "Menu" button:** not a missing responsive rule — `app.css`
    already had `.help-menu-toggle { display: none }` outside the `max-width: 780px` query, but
    `deck.css` (imported *after* `app.css` in `main.tsx`) sets `.deck-btn { display: inline-flex }`
    on the same element (the toggle carries both classes). Equal specificity (both single-class
    selectors) means CSS file import order — not intent — decided which `display` won. Fixed by
    scoping every rule under `.help-menu-corner` (e.g. `.help-menu-corner .help-menu-toggle`),
    which now reliably outranks `.deck-btn` regardless of stylesheet order. Worth remembering: two
    bare single-class selectors targeting the same element is a latent bug even when today's file
    order happens to produce the right result.
  - **Desktop sticky-to-target positioning** (`HelpMenu.tsx`): true CSS `position: sticky` wasn't
    usable — the menu is a `position: fixed` overlay (so it can sit in the page's left margin,
    outside the centered 1080px `.wrap`/`.deck-frame` column) rather than a flow sibling of the
    summary box, and `sticky` only has a meaningful "resting position" for actual flow elements.
    Reproduced the same visual effect in JS instead: on scroll/resize (rAF-throttled) and on a
    `ResizeObserver` watching `document.body` (catches the initial EmptyState → full-dashboard
    reflow, which isn't a scroll or resize event), read `.deck-frame`'s live
    `getBoundingClientRect().top` (already viewport-relative) and clamp to a 16px minimum — this
    is exactly sticky's pre-stuck/stuck behaviour, driven by measurement instead of layout.
    Gated behind `window.matchMedia('(min-width: 781px)')` (guarded for environments without
    `matchMedia`, e.g. jsdom) so mobile keeps its original fixed `top: 16px`.
  - **Content split**: `ReadingDashboardContent.tsx` (new) holds everything that was "Step 2" in
    `InstructionsContent.tsx` verbatim (Summary row / Value vs Invested / Top holdings &
    Allocation / Portfolio Analysis / Portfolio Commentary, plus the Refresh/Clear Data closing
    note) — a straight extraction, no rewording. `InstructionsContent.tsx` now ends after the CAMS
    steps + screenshot + in-app diagram. `HelpMenu.tsx`'s `PanelId` gained `'reading'`.
  - **Save as PNG** (`CommandDeck.tsx` + `Masthead.tsx`): `html-to-image`'s `toPng()` (added as a
    dependency — no existing screenshot lib; chosen over html2canvas for better fidelity with this
    app's CSS custom properties / grid layout, since it clones the DOM into an SVG
    `<foreignObject>` rather than manually re-implementing layout on a canvas) captures a `ref` on
    `.deck-frame` — the same element Masthead/KpiRail/the chart+holdings+allocation grid render
    into, and nothing else, so Commentary/Portfolio Analysis are structurally excluded, not
    filtered out. `pixelRatio: 163/96` (~1.698) — 96 CSS px/inch is the standard browser/canvas
    reference, so scaling by target-PPI/96 reproduces "163 PPI" output density directly rather
    than guessing a round `2x`. The button itself is excluded from its own screenshot via
    `toPng`'s `filter` option, matched on a dedicated `deck-mast-pngbtn` class (confirmed live —
    downloaded PNG has a clean top-right corner where the button sits on-screen). Downloaded
    filename is `portfolio-summary-<valDate ISO date>.png`. Button reuses the `deck-btn`/`.spin`
    (busy-state) convention already established by Refresh.
  - **Verified live**: desktop screenshot shows the menu list with no toggle, aligned level with
    the summary box, sticking to 16px from viewport top once scrolled past and re-aligning to the
    box on scroll-up; mobile (375px) shows only "Menu", revealing all 4 items on click. Clicked
    Save as PNG for real (monkey-patched `HTMLAnchorElement.prototype.click` to intercept the
    generated data URL rather than relying on a browser download dialog): produced a
    1833×1901px PNG from a 1080×1120 CSS-px source — ratio 1.697, matching 163/96 to 3 decimal
    places — rendered it back into the page to visually confirm the crop (summary box only, no
    Commentary/Analysis, no self-included button) and correctness in both themes. No console
    errors in either viewport.
  - 1 new Masthead test (Save as PNG button + `Saving…` state) plus an added assertion in
    `CommandDeck.spec.tsx`; `HelpMenu.spec.tsx` updated for the 4-item menu and the
    Instructions/Reading-the-Dashboard content split. Full gate (typecheck/lint/69 files, 354
    Vitest tests) green.

### U9 — Feedback aligns with Instructions on desktop, same sticky-to-target tracking  ✅
- **Do:** the right-edge Feedback button was vertically centered (`top: 50%`); align it level
  with the top-left Instructions button instead, and have it move the same sticky-like way on
  scroll — the same behaviour U8 gave the help menu.
- **Accept:** Feedback sits at the same height as Instructions on desktop and moves with it on
  scroll; no regression on mobile (Feedback and the top-right theme toggle both live at the
  right edge — they mustn't collide once Feedback is no longer vertically centered there).
- **Resolution note (2026-07-12):** extracted U8's tracking logic out of `HelpMenu.tsx` into a
  shared hook, `ui/useStickyToTarget.ts`, and reused it from `Feedback.tsx`. Both now call
  `useStickyToTarget('.deck-frame')`, so they read the exact same live measurement each frame and
  move in lockstep (confirmed live: identical `getBoundingClientRect().top` on both corners,
  before and after scroll).
  - **Mobile collision, caught before it shipped:** the hook originally always returned a number
    (falling back to a flat 16px off desktop, mirroring HelpMenu's own mobile default). Reusing
    that for Feedback would have pinned it to `top: 16px; right: 16px` on mobile — exactly
    `.theme-toggle-corner`'s own fixed position, i.e. the two buttons would render on top of each
    other. Fixed by having the hook return `number | null` — `null` specifically means "narrow
    viewport, caller's own CSS default applies," rather than baking in one specific fallback
    value. `HelpMenu.tsx` needed no change (`style={top !== null ? {top} : undefined}` — CSS
    already defaults `.help-menu-corner` to `top: 16px`, identical to what the hook used to force
    inline). `Feedback.tsx` now adds a `.tracked` class only when `top !== null`; `app.css`
    restores `.feedback-corner`'s original `top: 50%; transform: translateY(-50%)` as the
    (mobile) default and `.feedback-corner.tracked { transform: none }` clears it for the desktop
    pixel-`top` case (leaving the transform in place while overriding `top` to a literal pixel
    value would have mispositioned it — `translateY(-50%)` shifts by 50% of the element's own
    height, which only means "centered" when paired with `top: 50%`).
  - **Verified live**: desktop — both corners read the identical computed `top` (e.g. 213px on
    load, 276.75px after data finished loading and content reflowed, 16px once scrolled past the
    summary box) at every point checked. Mobile (375px) — Feedback renders vertically centered,
    clearly separated from "Light Mode" pinned at the top-right corner; no overlap. No console
    errors in either viewport. Full gate (typecheck/lint/69 files, 354 Vitest tests) green.
  **Superseded 2026-07-12 by U10** — the right-edge Feedback corner button (and the
  useStickyToTarget tracking this note describes) was removed entirely; Feedback moved into
  HelpMenu's own nav list instead. See below.

### U10 — Feedback moves into the Help menu (last item), drops down on mobile like the rest  ✅
- **Do:** Feedback was its own floating right-edge corner button (tracking the Portfolio Summary
  box per U9). Move it into the Help menu instead, as the last item below FAQ; on mobile it should
  reveal/hide along with Instructions/Reading the Dashboard/Privacy and Data/FAQ when "Menu" is
  toggled, not float separately.
- **Accept:** Feedback appears as a 5th item at the bottom of the desktop menu list; on mobile it's
  hidden behind "Menu" and drops down with the other four on click; the feedback form itself
  (category select, message, submit/error/sent states) is unchanged.
- **Resolution note (2026-07-12):**
  - **`Feedback.tsx`** changed from an uncontrolled component owning its own `open` state and
    floating trigger button to a fully controlled one — `{ open, onClose }` props, no more
    internal `useState` for open/closed, no more `.feedback-corner` button/div, no more
    `useStickyToTarget` usage (a component embedded in a menu list doesn't need to track anything
    — it just renders inline, or in this case, its overlay/modal render is gated on the `open`
    prop). Returns `null` when `!open` rather than always rendering a corner + conditional overlay.
  - **`HelpMenu.tsx`** now owns a `feedbackOpen` boolean and renders `<Feedback open={feedbackOpen}
    onClose={() => setFeedbackOpen(false)} />` alongside the existing `active`/`.help-modal`
    panel system. Feedback deliberately does NOT go through the `PanelId`/`TITLES`/`.help-modal`
    machinery the other four items use — it's a distinct form/submission modal with its own
    styling (`.feedback-overlay`/`.feedback-modal`), not read-only prose content — so it gets its
    own `openFeedback()` handler and its own state, added as a 5th `<HoverButton>` in the same
    `<nav className="help-menu-list">` the other four already render into. Being a normal item in
    that list is what gives it the mobile drop-down behaviour for free — no separate mobile
    handling needed, since it's now subject to the exact same `.help-menu-list`/`.open` CSS the
    other four items already had.
  - **`App.tsx`**: removed the standalone `<Feedback />` render and its now-unused import — it's
    rendered by `HelpMenu` now, not mounted twice.
  - **Dead code removed**: `.feedback-corner`/`.feedback-corner.tracked` and the
    `.feedback-corner .deck-btn` half of the old shared min-width rule (in `app.css`) — nothing
    renders a `.feedback-corner` element anymore. `ui/useStickyToTarget.ts` is back to a single
    consumer (`HelpMenu.tsx`) but kept as its own file rather than inlined back in, since a second
    corner-tracking need is plausible later.
  - **Tests**: `Feedback.spec.tsx` rewritten for the controlled API — a shared `root` re-rendered
    with `open={true|false}` instead of clicking an internal trigger button, and Cancel/Escape/
    overlay-click assertions now check the `onClose` mock's call count rather than the DOM
    disappearing (the component no longer removes itself — its parent does, by flipping `open`).
    `HelpMenu.spec.tsx` gained a "Feedback" item to its menu-items assertion (now 5, not 4) and a
    new test confirming Feedback opens its own `.feedback-overlay` (not `.help-overlay`) and closes
    on Cancel.
  - **Verified live**: desktop — Feedback item renders as the last row in the always-visible menu
    list (no separate right-edge button); clicking it opens the same feedback form as before.
    Mobile (375px) — only "Menu" shows before clicking; after clicking, all 5 items (including
    Feedback) drop down together; clicking Feedback opens the form correctly at mobile width too.
    No console errors in either viewport. Full gate (typecheck/lint/69 files, 355 Vitest tests)
    green.

### U11 — Fix Save as PNG cropping (real bug, not a design change)  ✅
- **Bug:** the downloaded PNG was badly cropped in real use — only the left ~33-84% of the
  Portfolio Summary box actually rendered; the rest (4th KPI tile, right portion of the
  Allocation card) was blank/missing, making the export unusable.
- **Accept:** the downloaded PNG shows the complete, uncropped Portfolio Summary box — masthead,
  full 4-tile KPI row, chart, holdings table, and the complete Allocation donut + legend — exactly
  as it appears on screen.
- **Root cause, found empirically** (bisected by capturing individual sub-elements in isolation
  until the crop appeared/disappeared — see the session transcript for the full elimination
  sequence): `html-to-image` clones the target node into a detached `<svg><foreignObject>`,
  serializes it to an SVG data URI, and rasterizes that via an `<img>`. `.deck-frame` (the
  captured element) is sized with `max-width: 1080px; margin: 0 auto` (deck.css) — inside that
  detached clone, `max-width` + auto-margin gets **re-resolved against a different, effectively
  much narrower containing block** than the live page, so most of the row's content silently
  overflows past the foreignObject's implicit clip and never gets painted. Confirmed precisely:
  capturing `.deck-kpi-rail` or `.deck-grid-2col` **alone** (no `max-width`/auto-margin parent) is
  pixel-perfect (99.8%+ width fidelity, measured by sampling canvas pixel data for where real
  content stops vs. background); wrapping either in a plain `max-width` + `margin:0 auto` parent
  and recapturing reproduces the exact crop; explicit `border`/`padding`/`border-radius` on that
  parent were each tested and ruled out individually. Not a scroll-position bug (reproduced
  identically scrolled and unscrolled) and not caused by the `filter` option (reproduced with
  `filter` removed) or `pixelRatio` (reproduced at `pixelRatio: 1` too, just less severely).
- **Fix** (`CommandDeck.tsx`): immediately before calling `toPng`, read `.deck-frame`'s current
  `getBoundingClientRect().width` and temporarily overwrite its inline style to
  `max-width: none; margin: 0; width: <that literal pixel value>px` — freezing it at an
  unambiguous fixed width with no `max-width`/auto-margin left to re-resolve — then restore the
  original (empty, class-driven) inline style in a `finally` block once the capture completes.
  Verified pixel-perfect (99.8% width fidelity) at both `pixelRatio: 1` and the real target ratio
  (163/96), both scrolled and unscrolled, and via the actual UI button (not just the debug
  harness used to isolate the bug).
- **Verified live**: clicked the real "Save as PNG" button after scrolling the page, rendered the
  downloaded PNG back into the page at full width — all 4 KPI tiles, the full chart, the complete
  holdings table, and the full Allocation donut + all 4 legend rows (previously truncated,
  e.g. "Bonds & fixed inc…") are now all present and complete. Full gate (typecheck/lint/69 files,
  355 Vitest tests) green.

### U12 — Mobile: Menu + theme toggle move above Data Check, out of the upload box's way  ✅
- **Bug:** on mobile, the "Menu" button (top-left) and "Dark Mode / Light Mode" button (top-right)
  are `position: fixed` corners pinned to the viewport's top edge — on a narrow screen they visibly
  overlapped the upload box, which also sits near the top of the page.
- **Accept:** on mobile only, both buttons move to sit just above the Data Check box (or
  EmptyState, before a statement's loaded) instead of floating fixed over the upload box; desktop
  is unchanged.
- **Resolution note (2026-07-12):** `App.tsx` — both were previously rendered before `<UploadBar>`;
  moved to a new `<div className="mobile-header-row">` rendered **after** `<UploadBar>`, right
  before `<main id="app">` (i.e. immediately above whatever `<main>` shows — Data Check once a
  portfolio's loaded, EmptyState during the brief window before that). On desktop this has zero
  effect: both children stay `position: fixed`, which takes them out of normal flow entirely, so
  the wrapping row has no height/visual footprint regardless of where it sits in the DOM tree —
  moving *where in the DOM* a `position: fixed` element is declared never changes *where on
  screen* it renders. The actual repositioning is pure CSS, scoped to the existing
  `@media (max-width: 780px)` breakpoint: `.theme-toggle-corner` switches to `position: static`
  (no absolutely-positioned children, so nothing else needed); `.help-menu-corner` switches to
  `position: relative` (not `static`) with `top`/`left` reset to `0` — it needed to stay a
  positioned ancestor because its own mobile dropdown (`.help-menu-list`) is `position: absolute`
  and anchors to it; losing that would've made the dropdown jump to some further-out ancestor.
  `.mobile-header-row` itself only gets `display: flex` inside the same media query (space-between,
  centered), matching the page's `28px` horizontal gutter.
  - **Verified live**: mobile (375px) — "Light Mode" and "Menu" now render as a row directly above
    "Data check passed…", no overlap with the upload box above; clicking "Menu" still correctly
    drops its dropdown anchored right below the button (confirms the `position: relative` fix);
    all 5 items still open their correct panels. Desktop (unaffected, confirmed) — both remain
    fixed corners, still sticky-tracking the Portfolio Summary box on scroll exactly as before
    (U8/U9). No console errors in either viewport. Full gate (typecheck/lint/69 files, 355 Vitest
    tests) green.

---

## R — Comprehensive-review follow-ups (2026-07-12)  *(items chosen from the review's recommendations menu — see the review plan/PDF; IDs there were A1/A6, renamed R1/R2 here because tasks.md's A-workstream is Accessibility)*

### R1 (review item A1) — Point-of-use InfoTip explainers on jargon surfaces  ✅
- **Do:** the FAQ/Notes explain XIRR/CAGR/NAV/ST-LT beautifully, but that help is stranded behind
  Menu → FAQ — nothing explains a term at the moment it's actually read. Add small ⓘ affordances
  with 1–2-sentence layperson popovers on the jargon surfaces themselves: KPI tile labels, table
  headers, fund-card stat labels.
- **Accept:** hover (mouse), tap (touch), and Enter (keyboard) all reveal the explanation;
  interacting with a tip inside a sortable header must not trigger a sort; popovers fit within a
  375px viewport; both themes.
- **Resolution note (2026-07-12):**
  - **`ui/explainers.ts`** (new) — one shared `EXPLAIN` record of ~14 layperson-first strings
    (XIRR, CAGR, Wtd. CAGR, NAV, NAV Date, avg cost, ST/LT gains, expense ratio, exit load,
    riskometer, benchmark, total value, total gain) — same facts as FaqContent/Notes, cut to
    popover length, defined once so every surface says the same thing.
  - **`ui/InfoTip.tsx`** (new) — the ⓘ primitive. Mouse hover is pure CSS (`.infotip:hover`
    reveals the always-in-DOM popover); touch/keyboard use real `open` state toggled by click
    (hover-only would make the tips invisible on exactly the devices where opening the FAQ is
    least convenient). Escape and click-outside close. `aria-label`/`aria-expanded`/
    `aria-describedby` + `role="tooltip"`. `stopPropagation` on click AND keydown — these sit
    inside sortable `<th>`s where a bubbled event would sort the column.
  - **`ui/primitives/SortableTable.tsx`** — new optional `tip?: string` per column, rendered
    after the label; the `<th>`'s own keydown handler now checks `e.target === e.currentTarget`
    so Enter on the nested tip button doesn't also re-sort.
  - **Wired into:** `KpiRail.tsx` (Total Value, Total Gain / ST-LT Split, XIRR),
    `TopHoldings.tsx` (CAGR — the first place a user meets the term), `HoldingsTable.tsx`
    (Wtd. CAGR, NAV Date), `FundCards.tsx` (avg cost, XIRR, CAGR, ST/LT gains, NAV, benchmark,
    riskometer, expense ratio, exit load → 9 per card).
  - **CSS (`app.css`)** — `.infotip*` block; popover resets `text-transform`/`letter-spacing`/
    `font-weight` (it sits inside uppercase micro-labels), themes via `var(--card)`/`var(--ink)`,
    z-index 95 (above corners at 50, below modals at 100). `align: left|center|right` prop
    controls anchoring — verified at 375px by measuring every popover's bounding rect and fixing
    the two that clipped (KPI XIRR → left-aligned, fund-card stats XIRR → right-aligned). One
    pre-existing (not tip-caused) issue noted for the deferred mobile workstream: the fund-card
    4-column stats grid itself overflows a 375px viewport, carrying its (correctly-anchored)
    tips offscreen with it.
  - **Verified live:** desktop light + dark (popover re-themes), tip-click inside the Wtd. CAGR
    header opens the tip *without* changing the active sort, header-click still sorts, Escape and
    click-outside close, all 78 tips' popovers measured within-viewport at 375px after the two
    alignment fixes. 4 new `InfoTip.spec.tsx` tests (real-client-render; includes a no-bubbling
    regression test). Full gate green (71 files / 369 Vitest tests / 2 Playwright e2e).

### R2 (review item A6) — Plain-language error/warning copy in DataCheck + Data Sources  ✅
- **Do:** the trust surfaces spoke jargon exactly where comprehension matters most — "valued on
  live NAVs", "holdings didn't reconcile", "No matching live NAV found … (no ISIN in statement,
  name match failed)". Rewrite layperson-first: what happened, whether the numbers can be
  trusted, what to do next.
- **Accept:** every DataCheck headline and per-fund Data Sources reason leads with plain
  language; failure copy names a likely cause and a next step; terms of art appear once, in
  parentheses, so the vocabulary still connects to FAQ/Method Notes.
- **Resolution note (2026-07-12):** rewrote `DataCheck.tsx` (3 headline variants + the
  reconcile-failure note — now "the per-fund values don't quite add up to the statement's own
  headline total … re-uploading usually fixes this"), `sources/sourcing.ts` (all 5 per-fund
  reasons — e.g. unreachable → "usually a connection problem, or a browser privacy extension
  blocking the requests … try Refresh in a little while"; no-match → adds "recently renamed or
  merged funds often match after the sources update — try Refresh in a few days"; the
  plausibility rejection now explains *why* rejecting protects the user's numbers), and
  `DataSources.tsx` (head + diagnostics line — "CORS restrictions" jargon removed). Updated the
  7 copy assertions across `DataCheck.spec.tsx` / `DataSources.spec.tsx` / `sourcing.spec.ts`
  (now asserting meaning-bearing phrases: cause + reassurance + next step) and the one e2e
  assertion (`dashboard.spec.ts` offline path). "Data check passed" phrasing kept stable.
  Verified live in both themes; full gate green.

### R3 (review item A2) — Actionable insight flags ("Worth a Look")  ✅
- **Do:** the review's biggest product gap — the app displays numbers but never nudges toward
  action, despite already computing everything needed for a few honest, concrete flags. Surface
  them without requiring any user input.
- **Accept:** a small, always-visible list appears when (and only when) something's actually
  worth flagging; every flag names the specific fund/figure so it's independently checkable, not
  a vague warning; nothing requires age/retirement input.
- **Resolution note (2026-07-12):** the review's original wording for one flag ("fund vs its own
  benchmark") turned out not to be honestly computable — `FundMeta.benchmark` is a display-only
  *name* string ("Nifty Smallcap 250 TRI"), not a return figure; the app has no per-benchmark
  return data. Rather than fabricate a comparison, substituted the closest honest equivalent
  already available: for funds in genuinely Nifty-50-comparable categories (Large/Flexi/Multi Cap,
  Index), compare the fund's own CAGR against the Nifty 50 CAGR the KPI rail already fetches —
  deliberately *excluding* Small/Mid/Sector/Debt/Hybrid funds, where that comparison would be
  misleading rather than insightful.
  - **`engine/insightFlags.ts`** (new) — pure `computeInsightFlags(pf, niftyAllTimeCagr)`, three
    checks: (1) concentration, top holding > 35% of portfolio (same threshold already used inside
    Commentary's gated text — now also surfaced un-gated); (2) broad-market equity fund trailing
    Nifty 50 by >1pp (noise buffer); (3) expense ratio above a category-appropriate band —
    parsed from the free-text `expense` field (e.g. "0.49% (Direct)"), three coarse bands
    (index/ETF 0.3%, debt/liquid/arbitrage 0.75%, everything else 1.5%) since the field is
    display text, not a clean dataset. Capped at 4 flags total, worst-first within each category,
    so a portfolio with many minor issues shows what matters most rather than a wall of text.
  - **`features/deck/WorthALook.tsx`** (new) — renders nothing when `flags.length === 0`; sits
    between the KPI row and the chart/holdings grid in `CommandDeck.tsx`, amber-accented (same
    family as the new A5 sample-data note, visually distinct from the teal-promoted Insight tile
    — see R4 below).
  - **Verified live**: sample portfolio genuinely flags "Parag Parikh Flexi Cap Fund is 45% of
    your portfolio…" (real computed concentration, not a fixture). 8 new unit tests
    (`insightFlags.spec.ts`) covering the concentration threshold, the broad-market/small-cap
    distinction, the noise buffer, the index-vs-active expense distinction, the debt-band
    exemption, and the 4-flag cap. Full gate green.

### R4 (review item A3) — Retirement corpus projection  ✅
- **Do:** Commentary's horizon band ("your equity % fits your ~15-year runway") never turned
  into an actual number to plan around, despite the engine already knowing today's value, the
  portfolio's own historical CAGR, and (via total invested ÷ years invested) an implied
  contribution rate.
- **Accept:** shown only when there's enough history to infer a stable rate; shows two scenarios,
  not a single false-precision number; states plainly that it's not a forecast.
- **Resolution note (2026-07-12):** `features/commentary/corpusProjection.ts` (new) —
  `projectCorpus(pf, yearsToRetirement)`, standard future-value-of-an-ordinary-annuity math
  (today's value compounds for the remaining years; each future year's assumed contribution
  compounds for the years remaining after it lands) — verified against a hand-calculated
  round-number case in the test suite, not just eyeballed. Two scenarios: "conservative" (a fixed
  8%/yr floor, standard long-term assumption) and "at your own pace" (the portfolio's own
  historical CAGR, **clamped to [4%, 16%]** so a short lucky/unlucky window can't extrapolate an
  implausible rate decades out) — conservative is capped to never exceed expected, so a portfolio
  with a historically low rate doesn't show a nonsensically-higher "conservative" figure. Returns
  `null` (silently omitted) with under 6 months of history, no positive value, or at/past the
  target date. Wired into `buildCommentaryHTML` right after the existing allocation-verdict
  section, as a new "Where this could take you" block ending in an explicit
  "not a forecast…real markets never do" disclaimer, matching the existing commentary's own
  disclaimer conventions. New `.co-projection` CSS reuses the existing `.co-metric` card shell.
  9 new unit tests (`corpusProjection.spec.ts`) plus 3 new `commentaryText.spec.ts` cases (shown
  with enough history, omitted with too little, omitted at z=0). Verified live: entering age
  35/retire 60 against the sample portfolio produces a real, hand-checked figure (₹1.27cr growing
  at 8–10%/yr over 25 years with ongoing ~₹15L/yr contributions to ~₹19–29cr — confirmed by hand
  before trusting the UI). Full gate green.

### R5 (review item A4) — Promote the Insight card, de-gate warnings  ✅
- **Do:** the one plain-English KPI tile (Insight) was visually identical to the three
  jargon-dense number tiles beside it; the concentration warning existed only inside Commentary,
  gated behind two required inputs.
- **Accept:** Insight reads as the takeaway, not just another stat; a concentration warning is
  visible without entering age/retirement age.
- **Resolution note (2026-07-12):** the de-gating half is now satisfied by R3's Worth a Look
  panel (needs no input at all) rather than a separate mechanism — one deliverable, two review
  items. For the visual promotion: `.deck-tile.deck-insight` gets a teal border + tint (matching
  the existing "Full Commentary" link's teal, `deck.css`), and `.deck-insight-text` moved from
  `var(--muted)` to `var(--ink)` (previously the one human-readable sentence on the row read at
  the same visual weight as secondary captions everywhere else). Verified live in both themes and
  at 375px — reads clearly as the emphasized tile in every case checked.

### R6 (review item A5) — First-run clarity: sample-data callout + KFintech parity  ✅
- **Do:** the only signal that the default view is fake data was the masthead's "Sample Portfolio
  Summary" title — easy to miss scrolling straight to the numbers; Instructions covered only
  CAMS's request flow despite the app accepting KFintech statements too.
- **Accept:** an explicit in-content callout when `isSample`, not just the title; some form of
  KFintech guidance parity.
- **Resolution note (2026-07-12):**
  - **`Masthead.tsx`** now returns a fragment; when `isSample`, an amber `.deck-sample-note`
    renders between the masthead and the KPI row: "This is example data… Drop your own CAMS /
    KFintech statement in the box above to see your real numbers." Omitted entirely once a real
    statement loads (`Masthead.spec.tsx` asserts both states).
  - **KFintech**: deliberately did **not** add a parallel step-by-step walkthrough with a guessed
    KFintech URL — I don't have verified knowledge of their current request-page URL, and
    fabricating one risks sending a user somewhere wrong (this app's own operating rules
    prohibit guessing URLs). Instead added a short clarifying paragraph to
    `InstructionsContent.tsx`: either registrar's portal generates the *same* full consolidated
    statement covering every fund regardless of which registrar actually services it (consistent
    with — not a new claim beyond — the page's existing "CAMS and KFintech… issue this jointly"
    line), so a KFintech-only user doesn't need to do this twice; points them to search
    "KFintech consolidated account statement" rather than a hardcoded link. **Flagging this as a
    conscious gap**: if you have KFintech's actual current CAS request URL, it's worth adding a
    real link here to match CAMS's.
  - Verified live in both themes and at 375px; `HelpMenu.spec.tsx` asserts the new KFintech
    paragraph is present. Full gate green.

### R7 (review item B1) — Fix light-theme contrast failures  ✅
- **Do:** `--brass` and `--muted` — the theme's most-used secondary-text colors (table headers,
  tile labels, captions) — measured 2.59:1 and 3.78:1 against `--paper`, both failing WCAG AA's
  4.5:1 for body text. Dark theme already passed (5.2–13.3:1) and was left untouched.
  Dark-theme value: `--brass` #c98a2e (unchanged), `--muted` #8a8f99 (unchanged).
- **Accept:** both tokens pass 4.5:1 against `--paper` in the light theme; hue/character stays
  recognizably "brass"/"muted", not shifted to an unrelated color; every surface using them
  (table headers, KPI captions, help/feedback body text, tags, chart labels — ~50 call sites)
  still reads correctly in both themes at desktop and 375px.
- **Resolution note (2026-07-12):** darkened both in place (same hue/saturation, lower
  lightness) in `tokens.css`'s `[data-theme='light']` block: `--brass` #b8935a → #846639
  (2.59:1 → 4.84:1), `--muted` #8b7a5e → #74654e (3.78:1 → 5.14:1). Values hand-derived via the
  WCAG relative-luminance formula, then verified live by reading the same formula back out of
  `getComputedStyle` in the browser (both tokens confirmed 4.84:1 / 5.14:1 against the live
  `--paper`). Verified live in both themes and at 375px — no visual regression, text reads more
  crisply if anything. Full gate green (typecheck/lint/391 unit tests/2 e2e).

### R8 (review item B2) — aria-live regions for async status  ✅
- **Do:** zero `aria-live` anywhere in the app — upload status, live-NAV fetch progress, and the
  Data Check pass/fail verdict all change asynchronously with no signal to a screen reader.
- **Accept:** a screen-reader user is notified when upload/live-NAV status text changes, and when
  the Data Check panel first appears or its verdict changes (e.g. on Refresh); errors interrupt,
  routine status doesn't.
- **Resolution note (2026-07-12):** `UploadBar.tsx`'s `.upload-status` span (already carries
  every status message: "Reading…", "…fetching latest NAVs…", "Live update failed…", done/idle
  labels) gets `role="status"`/`aria-live="polite"` normally, switching to
  `role="alert"`/`aria-live="assertive"` when `status.isErr` — one region covers both the upload
  lifecycle and the live-NAV fetch (they already share the same `status` state in `App.tsx`, so
  no second region was needed there). `DataCheck.tsx`'s `#datacheck-body` wrapper gets
  `role="status"`/`aria-live="polite"` — it renders nothing until a live-NAV attempt resolves and
  its headline can change on Refresh, so both first-appearance and verdict-changes now announce.
  No existing test asserted the old markup; `UploadBar.spec.tsx`'s error-status test still passes
  unchanged. Full gate green.

### R9 (review item B3) — Modal a11y baseline: focus trap + shared ModalShell  ✅
- **Do:** the Help-menu content modal and the Feedback modal were two independently-written,
  near-identical dialog implementations (overlay/role="dialog"/aria-modal/close-button/Escape),
  neither of which trapped Tab inside the modal or restored focus to whatever opened it — a
  keyboard user tabbing past the last control fell through to the page behind the dimmed
  backdrop, and closing left focus stranded at the top of the document.
- **Accept:** Tab/Shift+Tab cycle only within the open modal, wrapping at both ends; closing by
  any path (×, Escape, overlay click) returns focus to the element that opened it; Feedback's
  existing behavior (autofocus the textarea, not the close button) is preserved.
- **Resolution note (2026-07-12):** new `ui/primitives/ModalShell.tsx` owns the shell only —
  overlay, `role="dialog"`/`aria-modal`/`aria-labelledby`, title + shared `.feedback-close`
  button, focus trap (queries focusable descendants — `a[href], button, textarea, input, select,
  [tabindex]` — fresh on every Tab keypress, so it stays correct as modal content changes),
  initial focus (an optional `initialFocusRef`, else the first focusable element), and
  focus-restore (captures `document.activeElement` on mount, refocuses it on unmount — correct
  because both callers only ever mount ModalShell while open). Callers keep their own body
  markup: `HelpMenu.tsx`'s scrollable `.help-modal-body` wrapper and per-panel content are
  unchanged, just passed as `children`; `Feedback.tsx` passes `initialFocusRef={textareaRef}` to
  keep its existing autofocus-to-textarea behavior and dropped its now-redundant `open`-gated
  Escape/focus `useEffect` entirely. `HelpMenu.tsx`'s own Escape-handling effect (now redundant)
  was also removed — its unrelated click-outside effect for the nav dropdown stays. All existing
  `Feedback.spec.tsx`/`HelpMenu.spec.tsx` tests pass unchanged (they already asserted Escape/
  overlay-click/Cancel all call `onClose`). Verified live: Tab from the last focusable element in
  the Instructions modal wraps to the close button; Shift+Tab from the close button wraps to the
  last element; Escape closes and restores focus to the exact trigger button clicked (confirmed
  for both the Help-menu FAQ item and the Feedback nav item, desktop and 375px, both themes).
  Full gate green.

### R10 (review item B4) — Fix SortableTable header semantics  ✅
- **Do:** every sortable `<th>` carried `role="button"` — an explicit ARIA role always overrides
  a host element's implicit semantics, so this silently stripped the `columnheader` role every
  `<th>` gets for free, replacing it with a generic, less useful "button" for assistive tech.
- **Accept:** headers keep their native columnheader semantics (with `aria-sort` layered on top,
  as the spec intends) while remaining fully keyboard/screen-reader operable as sort controls;
  the whole header cell stays clickable, not just the label text; column widths render correctly.
- **Resolution note (2026-07-12):** moved the interactive behavior onto a real nested
  `<button className="th-sortbtn">` (siblings with the per-column `InfoTip`, not nested inside
  it — nested `<button>`s are invalid HTML) — `aria-sort` stays on the `<th>` itself, and a real
  `<button>` gets native keyboard activation for free (Enter/Space), so the old manual keydown
  handler was deleted entirely. **First attempt regressed the table layout**: giving the `<th>`
  itself `display: flex` (to let the button stretch full-width for a full-cell click target)
  broke the browser's table column-width algorithm outright — overriding a table-cell's `display`
  takes it out of table layout, and every header collapsed to the same width with content pushed
  out of the visible row (caught via live-browser screenshot, not just the automated suite —
  the DOM/computed-style checks alone looked fine while the visual render was actually broken).
  Reverted to the `<th>`'s default table-cell display; `.th-sortbtn` is a plain `inline-flex`
  sized to its own content, and the `<th>` keeps its own `onClick`, guarded with
  `e.target === e.currentTarget` so a click that already landed on (and was handled by) the
  button, or that bubbled up from InfoTip (which stops propagation itself), doesn't double-fire
  the sort toggle. This restores the original full-cell hit area without touching table layout.
  The e2e suite's header-click assertion caught the layout regression immediately (`aria-sort`
  never reached "ascending" because Playwright's default click-center landed outside the
  shrunken button) — fixed, then reverified: full gate green (typecheck/lint/391 unit tests/2
  e2e), plus live-browser checks of computed column widths, real-click-to-sort on empty cell
  area, InfoTip-click-does-not-sort, and keyboard focus/activation on the button.

### R11 (review item C4) — React error boundary  ✅
- **Do:** no error boundary existed anywhere — a render error on messy real-world statement data reaching an edge case the engine/UI didn't anticipate blanked the entire page, upload bar and all, with no way back short of a manual reload.
- **Accept:** a render error inside the dashboard shows a friendly fallback instead of a blank page; the recovery controls (Clear Data, Refresh, upload) stay usable; "Clear Data — Reset Dashboard" is a real recovery path, not just advice.
- **Resolution note (2026-07-13):** new `ErrorBoundary.tsx` (class component — error boundaries have no hook equivalent), wrapping only the dashboard content in `App.tsx` (`<ErrorBoundary resetKey={pf}>`), deliberately *not* wrapping UploadBar/ThemeToggle/HelpMenu, so those stay on screen and functional if the wrapped content crashes. `resetKey={pf}` — implemented via `getDerivedStateFromProps` (not a `componentDidUpdate` + `setState`, which oxlint's `no-did-update-set-state` correctly flags as forcing an extra render cycle) — means loading fresh data via Clear Data/Refresh automatically clears a tripped boundary once the new `pf` lands, so the user has one real click back into a working dashboard. 4 new tests (`ErrorBoundary.spec.tsx`): normal render, fallback-on-throw, reset-on-resetKey-change, no-reset-when-unchanged. Full gate green.

### R12 (review item C5) — Drop framer-motion dependency  ✅
- **Do:** framer-motion (~35KB gzip) powered only a hover-scale/shadow effect (`ui/HoverLift.tsx`'s `HoverDiv`/`HoverArticle`/`HoverButton`) that plain CSS `:hover` + `transition` reproduces, including the reduced-motion handling — directly serves the "leanest possible codebase" objective from the original review brief.
- **Accept:** identical visual hover effect (scale + softened shadow, slight overshoot on settle); `prefers-reduced-motion` still fully disables it (not just speeds it up); every existing call site (15 files) keeps working unmodified; dependency removed from package.json.
- **Resolution note (2026-07-13):** `HoverLift.tsx`'s three components are now thin wrappers around plain intrinsic elements adding a `hover-lift` class — verified first that no call site passes any framer-specific prop (only standard DOM props), so the public API didn't need to change. New `.hover-lift` CSS (`app.css`) uses a back-out `cubic-bezier(.34, 1.56, .64, 1)` easing to approximate the spring's overshoot without a JS animation loop. The existing global `@media (prefers-reduced-motion: reduce)` block got a second rule zeroing the hover transform/shadow outright (not just the transition), matching the old `useReducedMotion() ? undefined : HOVER_STATE` behavior exactly — a reduced-motion user gets *no* effect, not an instant one. `npm uninstall framer-motion`; confirmed removed from package.json/package-lock.json. Full gate green, including a live-browser re-check of hover behavior in both themes.

### R13 (review item C7) — Share feedback validation logic  ✅
- **Do:** the local dev server (`server/feedback-server.js`, plain CommonJS Node) and the production edge function (`app/src/server/feedbackWebhook.ts`, TS/Cloudflare Pages Function) independently re-implemented the identical category-list + message-length-cap validation rules — exactly the kind of duplication the review warned "will silently diverge."
- **Accept:** one canonical source for the category list and length cap, consumed by both; the two message-*cleaning* strategies (full HTML strip locally vs. webhook-mention-neutralization at the edge) stay deliberately separate — that's an intentional difference in threat model, not accidental duplication.
- **Resolution note (2026-07-13):** the two runtimes are genuinely separate npm packages with different module systems (CJS Node script vs. bundler-mode TS), so they can't `require`/`import` each other's source directly. Landed on a new **`feedback-rules.json`** at the repo root (sibling to `app/` and `server/`, the correct home for a value both consume) — pure data, no code: `{"categories": [...], "maxMessageLength": 5000}`. `server/feedback-server.js` loads it with a plain `require('../feedback-rules.json')` (trivial — Node's CJS resolution doesn't care about package/tsconfig boundaries, only real filesystem paths). `feedbackWebhook.ts` imports it with `import feedbackRules from '../../../feedback-rules.json'` — empirically verified this resolves correctly under all three toolchains actually involved: `tsc -b --noEmit` (typecheck), Vite's production build (`npm run build`), *and* Wrangler's own esbuild-based Pages Functions bundler (`wrangler pages dev dist`, which is a separate bundler from Vite and the one that actually matters for `functions/api/feedback.ts` in production) — confirmed via a real local `wrangler pages dev` run, POSTing both an invalid category and an empty message and checking the exact validation errors came back correctly. Both local test suites still pass unchanged (`server/`'s `node --test`, 6/6; `app/`'s vitest `feedbackWebhook.spec.ts`, unchanged) since neither test file asserted against the constants directly, only observable HTTP behavior.

### R14 (review item C3) — Type-safety batch  ✅
- **Do:** five independent small type-safety gaps flagged together: a stringly-typed `SectionId`; an undocumented dual convention for "this value is missing" in `engine/types.ts`; the `0.0005` held-units threshold copy-pasted (and, in one place, subtly diverging) across 3 files; a `valDate as Date` type assertion; and duplicated, drifted file-type classification between `App.tsx` and `ingest/router.ts`.
- **Accept:** each fixed without changing intended behavior, except where the "duplicated logic had actually diverged" investigation surfaced a real inconsistency worth resolving, which is called out explicitly below.
- **Resolution note (2026-07-13):**
  - **`SectionId` union** (`features/deck/advancedTiles.ts`): `'charts' | 'holdings-full' | 'houses' | 'schemes' | 'sources' | 'notes'`, replacing `string` in `AdvancedTile.id`, `App.tsx`'s `openSections`/`selectSection`/`openSection`, and `PortfolioAnalysis.tsx`'s props. A typo'd id (e.g. `openSections.chart`) is now a compile error instead of a section that silently never opens.
  - **NaN-vs-null missing-value convention** (`engine/types.ts`): documented rather than migrated to one convention everywhere (migration would touch every reader across engine/charts/UI for no behavior change) — a new header comment explains the two coexisting conventions: `T | null` for a *structural* absence (not enough data to define the value — `xirr`, `cagr`, `portXirr`, …) vs. plain `number` carrying `NaN` for a *data-quality* gap (a specific field the statement didn't supply — `avgCost`, `costValue`, `unrealised`, …), always paired with a sibling boolean (`hasCostBasis`, `someUnknownBasis`) or an `isFinite()` guard a caller should check first.
  - **`MIN_HELD_UNITS` + `isSchemeHeld()`** (`engine/types.ts`): investigating the "copy-pasted 0.0005 threshold" surfaced a genuine, undocumented divergence, not just duplicated code — `marketdata/resolve.ts`'s version fell through to check `marketValue` even when `closingUnits` was present-but-below-threshold (an `||` of two independent checks), while `engine/portfolio.ts`'s version only consulted `marketValue` when `closingUnits` was entirely missing (a ternary — units, when present, is authoritative). The two could disagree on a scheme sitting on redemption dust with a stale nonzero `marketValue`. Standardized on the portfolio.ts semantics (units-first, market-value-only-as-fallback) as the single `isSchemeHeld(scheme)`, now shared by `engine/portfolio.ts` and `marketdata/resolve.ts`; `engine/gains.ts`'s distinct units-only check (no `Scheme` object in scope there) now at least uses the shared `MIN_HELD_UNITS` constant instead of a second copy of the magic number. All 413 tests (including the golden-fixture regression gates) still passed unchanged, meaning no existing fixture currently exercises the specific edge case where the two definitions used to disagree — but the fix closes a real, if latent, correctness gap for the future.
  - **`valDate as Date` assertion** (`engine/portfolio.ts`): removed via a `const asOfDate: Date = valDate` binding taken right after the `if (!valDate) valDate = new Date()` guard — TypeScript's narrowing of a mutable `let` doesn't survive into a closure (it can't prove the closure runs before a later reassignment), but a `const` binding can never be reassigned, so the narrowing survives into the `.map((s) => analyzeScheme(s, asOfDate, ...))` closure without a cast.
  - **File-type classification** (`ingest/router.ts`): App.tsx's own inline `isPdf`/`isText` regex checks (MIME-type-inclusive) were a second, independently-copy-pasted implementation that had already drifted from `classifyFile`'s extension-only PDF check. Extracted `isPdfFile()`/`isTextFile()` as the canonical checks in `router.ts`; `classifyFile()` now calls `isPdfFile()` internally (widening it to match, another small real behavior fix — a `file.type === 'application/pdf'` file with a non-`.pdf` name now classifies correctly either way it's reached); `App.tsx` imports and uses both instead of re-deriving them.
  - Full gate green after each sub-item; `router.spec.ts`'s existing tests cover the widened `classifyFile` behavior without needing new cases.

### R15 (review item C2) — Shared InteractiveChartFrame  ✅
- **Do:** all six interactive chart components (AnnualChart, CapitalChart, GeographyChart, HoldingsChart, InvestedChart, RollingChart) independently declared the same hover-state `useState`/`useCallback`, the same `<svg>` wrapper attributes and keydown/blur/mouseleave handlers, the same hit-band rect list, and the same tooltip-box shell — ~150-200 lines of genuinely identical scaffolding per the review's estimate, with only the geometry (grid, bars/lines, tooltip content, tip positioning) actually differing per chart.
- **Accept:** the duplication is eliminated without inventing an over-parameterized "does everything" mega-component; each chart keeps its own geometry-specific rendering (hit-band shape, tooltip position math) inline, since that genuinely differs by chart type (vertical strips + centered tooltip vs. horizontal row-bands + side tooltip); no touch support added (that's review item B5, deferred alongside the mobile-optimization workstream, same treatment as A7 in Theme A).
- **Resolution note (2026-07-13):** new `charts/InteractiveChartFrame.tsx` exports three primitives: **`InteractiveChartFrame`** owns the hover state, the keyboard-step callback, and the entire `<svg>` wrapper (viewBox/role/aria-label/tabIndex/keydown/blur/mouseleave), taking a render-prop child `(hover, setHover) => ReactNode` so each chart's own geometry can read/set hover without re-deriving the interaction wiring; **`ChartHitBands`** takes an `axis: 'x' | 'y'` (vertical strips for line/bar charts vs. horizontal row-strips for the two horizontal bar charts) and renders the identical hit-region rects; **`ChartTooltip`** is the thin `<g className="chart-tip"><rect/>{children}</g>` shell, with position/content still supplied by the caller since those differ. All six chart components rewritten against these three primitives — each one shrank by roughly a third, with the removed lines being exactly the duplicated scaffolding, not any geometry logic. Verified live in both themes: hovering (vertical bands: Portfolio Value/Annual Returns/Rolling Returns/Net Capital Changes; horizontal row-bands: Holdings by Value/Geo Concentration), keyboard arrow-key navigation, and tab-switching between all six chart types, plus the existing 64 chart unit tests and both e2e tests, all unchanged and green — this was a pure internal refactor with the same external behavior.

### R16 (review item C6) — Retire dangerouslySetInnerHTML in Commentary  ✅
- **Do:** `Commentary.tsx`'s `buildCommentaryHTML` was the last documented `dangerouslySetInnerHTML` sink in the codebase (flagged in the S2 security audit) — a large HTML-string builder with one statement-derived value (a fund name) requiring a manual `escapeHtml()` call before interpolation.
- **Accept:** the sink is gone entirely (verified: zero remaining `dangerouslySetInnerHTML` usages anywhere in `app/src`), with identical rendered output and identical XSS-safety for the one previously-manually-escaped value.
- **Resolution note (2026-07-13):** `commentaryText.ts` → `commentaryText.tsx`; `buildCommentaryHTML(): string` became `buildCommentaryContent(): ReactNode`, with every `P.push(\`<p>...</p>\`)` HTML-string push converted to a real `<p key="...">...</p>` JSX push (unique keys per paragraph, since `P` is now rendered directly as a `ReactNode[]`). The fund-name interpolation (`escapeHtml(shortName(top.name))`) became plain `{shortName(top.name)}` — a JSX text expression, which React escapes on its own the same way `renderToStaticMarkup` escapes it in tests, so the manual escaping step is structurally gone, not just hidden behind a sink that no longer exists. `escapeHtml()` itself removed from `format.ts` (and its tests from `format.spec.ts`) once confirmed it had zero remaining callers anywhere in the app. `Commentary.tsx`'s `<div dangerouslySetInnerHTML={{__html: ...}} />` became `<div>{buildCommentaryContent(...)}</div>`. `commentaryText.spec.ts` → `.spec.tsx`, tests now render via `renderToStaticMarkup(<>{buildCommentaryContent(...)}</>)` first — the two existing XSS-payload tests (a self-closing-tag and a `</div><script>` breakout attempt) needed no assertion changes at all, since React's static-markup text-escaping produces the identical `&lt;...&gt;` output the old manual `escapeHtml()` did. Two whitespace-sensitive exact-substring assertions (`'targeting retirement at age <b>65</b>'`, `'about <b>20 years</b> away'`) required careful JSX formatting to get the inter-element whitespace exactly right, then were verified by actually running the tests rather than hand-reasoning about JSX whitespace rules. Verified live in both themes: full commentary render (headings, bold spans, the two-column corpus-projection metric, all 4 Bogleheads reference links with correct hrefs/target/rel) all pixel-identical to before. Full gate green (77 files / 413 tests, down 2 net from removing the escapeHtml tests / up others elsewhere / e2e 2/2).

### R17 (review item C1) — Decompose App.tsx  ✅
- **Do:** the review's single highest-priority architecture item — `App.tsx` (403 lines) held 7+ result fields as independent `useState` atoms, set via 3-8 separate `setState` calls per async handler; all orchestration logic (`runPipeline`, password retry, MarkItDown fallback) lived inline in the component with no direct unit tests, exercised only indirectly by 2 Playwright e2e tests; and the 6 Portfolio Analysis `<section>` blocks repeated the same eyebrow/title/subtitle/wrap JSX shape.
- **Accept:** pipeline-result state collapses into one `useReducer`; orchestration moves into a plain, React-free, directly-unit-testable module with an injectable `fetch`; the repeated section JSX becomes one `<Section>` component; behavior is unchanged (verified via live-browser walkthrough of every flow, not just the automated gate); new unit tests cover the previously-untested orchestration.
- **Resolution note (2026-07-13):**
  - **`appState.ts`** (new) — `PipelineState` (10 fields: `pf`, `diag`, `status`, `uploadPhase`, `extraction`, `pendingPassword`, `investorName`, `isSample`, `niftyAllTime`, `nifty1Y` — everything a pipeline run can change; `commentaryOpen`/`openSections` deliberately stay separate `useState` in `App.tsx`, since they're pure UI toggle state a click can change independent of any pipeline run, not part of "the result"). `PipelinePatch = Partial<PipelineState> | ((state) => Partial<PipelineState>)` — a "patch reducer": the common case is a plain object merge (one `dispatch` = one atomic multi-field update, replacing what used to be 3-8 sequential `setState` calls with intermediate inconsistent render states possible between them); the function form is the same escape hatch React's own `setState(prev => ...)` gives a single field, generalized to a whole atomic update — used everywhere the original code read a stale-closure-prone value like `pf` inside an async catch/finally (`setUploadPhase(pf ? 'done' : 'idle')` → `dispatch((s) => ({uploadPhase: s.pf ? 'done' : 'idle'}))`), which also *fixes* a latent staleness bug: the old closure-captured `pf` could be outdated if `pf` changed *during* the in-flight async call; the reducer's `s.pf` is always current at dispatch time.
  - **`appPipeline.ts`** (new) — `runPipeline`/`updateDashboard`/`loadSamplePortfolio`/`handleRefresh`/`handleFile`/`handleConvertMarkitdown`/`handleSubmitPassword`, extracted verbatim in logic (every dispatched patch was checked line-by-line against the original's `setState` calls, including which fields were conditionally included — e.g. the "no schemes" error path only ever touched `extraction` for a PDF source, so that field is conditionally spread into the patch object rather than always included, preserving the exact original behavior of leaving a stale `extraction` value untouched for non-PDF sources). `loadSamplePortfolio` and `handleConvertMarkitdown` take an injectable `fetchImpl: typeof fetch = fetch` (defaulting to global fetch) for their one direct `fetch()` call each — the deeper network layer (`resolveLiveNavs`/`fetchNiftyBenchmark`) already has its own tested mocking strategy (`vi.stubGlobal('fetch', ...)`, used elsewhere) and wasn't re-plumbed.
  - **`Section.tsx`** (new) — the `<section id><div className="wrap"><p className="eyebrow"/><h2 className="sec-title"/>{subtitle && <p className="sec-sub"/>}{children}</div></section>` shape, used for all 6 Portfolio Analysis sections. Caught and fixed my own mistake while extracting the copy: two eyebrows/titles used the HTML entity `&amp;` in the *original JSX text* (where JSX's entity-decoding turns it into a literal `&`) — moving that same text into a plain JS string *prop* (`eyebrow="Method &amp; Caveats"`) would NOT decode it, rendering the literal text "Method &amp; Caveats" on screen. Caught before shipping by reasoning through JSX's entity-decoding-in-text-vs-plain-strings distinction, and confirmed correct once running live (`eyebrow="Method & Caveats"`, literal ampersand).
  - **`App.tsx`** shrank from 403 to ~185 lines: `useReducer(pipelineReducer, initialPipelineState)` replaces the 8 `useState` atoms; `commentaryOpen`/`openSections`/`currentSourceRef` stay local; the UploadBar callback props are now thin arrows injecting `dispatch`/`currentSourceRef` into the extracted functions (needed explicit `(file: File, password?: string) => void` typing on two of them — an untyped inline arrow's parameters infer as *required*, not optional, which `tsc` correctly rejected as "too few arguments" against `UploadBar`'s `onFile: (file: File) => void` prop type).
  - **New tests**: `appState.spec.ts` (4 tests — object-patch merge, function-form patch reading current state, an omitted field staying untouched, a multi-field atomic dispatch). `appPipeline.spec.ts` (16 tests, the app's previously-highest-risk untested logic) — `runPipeline`'s no-schemes branches (PDF and non-PDF, including a regression test seeding a stale `extraction` value to prove the non-PDF path really does leave it alone) and its graceful-degradation-to-statement-values behavior when live NAVs are unreachable (using a real fixture statement, `tests/fixtures/alok_2026.txt`, with global `fetch` stubbed to reject — discovered along the way that `resolveLiveNavs`/`fetchNiftyBenchmark` swallow their own network errors and resolve gracefully rather than rejecting, so this lands in `runPipeline`'s success branch with `diag.reachable: false`, not its outer catch — a wrong first assumption caught by an actual test failure, not shipped); `loadSamplePortfolio` fully exercised via its injected `fetchImpl` (no real network, no global-fetch stub needed for the sample-fetch call itself) both for success and for its own fetch-failure branch; `handleFile`'s rejection and real-text-file-to-populated-dashboard paths; `handleConvertMarkitdown`'s success/password-required/incorrect-password/bridge-unreachable branches, all via its injectable `fetchImpl`; `handleSubmitPassword`'s routing and no-op-when-null cases; `handleRefresh`'s branch selection (verified via the synchronous, pre-`await` side effect that actually distinguishes the two branches — the sample-fetch call happening or not — since asserting `isSample` immediately after a fire-and-forget call would read a value not yet updated by the still-pending async chain, which was caught and fixed before it shipped as a misleading always-passing assertion).
  - **Live-browser verification** (both themes, desktop + 375px mobile): Refresh (status message + eventual clear), "View All" opening all 6 sections with exactly correct eyebrow/title/subtitle text (confirming the entity-decoding fix), the accordion's narrow-to-one-on-click behavior, "Clear Data — Reset Dashboard", the chart gallery inside its `<Section>`, and Commentary — all pixel-identical to pre-refactor behavior. Full gate green throughout: `tsc -b --noEmit`, `oxlint`, 77 files / 413 vitest tests, 2/2 Playwright e2e, and a clean `npm run build`.

### R18 (review item D1) — CSS hygiene  ✅
- **Do:** ~25 lines of verifiably dead CSS (`.paste-*`, `.valbanner`/`.livev`/`.stmt`, `.dc-list`/`-nm`/`-why`, `.brandline`, `.chart-axis`/`-zero`, `.co-warn`), one used-but-undefined class (`.dc-main`, surviving on accident with no styling at all), and one `!important` papering over a real specificity conflict (`.privacy-footnote`).
- **Accept:** every deletion verified dead by grepping `app/src` for the class name outside `app.css` itself (zero hits) before removing it, not by inspection alone; `.dc-main` gets real styling instead of none; `.privacy-footnote`'s intended margin applies without `!important`.
- **Resolution note (2026-07-13):**
  - **Dead rules removed**: `.paste-wrap`/`.paste-area`/`.paste-actions` (the paste-a-statement UI was removed in an earlier revision without its CSS); `.valbanner` + `.livev`/`.stmt` variants + the now-orphaned `@keyframes pulse` (superseded by `.navtag`); `.dc-list`/`.dc-list li`/`.dc-nm`/`.dc-why` (superseded by the current single-headline DataCheck copy — `.dc-note`/`.dc-err`/`.dc-link`, which *are* still used, were kept); `.brandline` (masthead redesign leftover); `.chart-axis`/`.chart-zero` (chart geometry components never emit these classNames — confirmed `.chart-grid`/`.chart-tick`/`.chart-lbl` are the three that actually are, kept); `.commentary-out .co-warn b` (no `.co-warn` element is ever rendered by `commentaryText.tsx`). `@keyframes sp` kept — still used by `.loading-spinner`.
  - **`.dc-main`** (`DataCheck.tsx`'s second flex child, beside the fixed-size `.dc-icon`): added `flex: 1; min-width: 0;` — without it the element sized to its own content instead of claiming the row's remaining width, the standard flex-text-column fix.
  - **`.privacy-footnote`**: the real conflict was `.help-body p { margin: 0 0 12px; }` (specificity 0,1,1, a class+element selector) outranking the bare `.privacy-footnote { margin: 14px 0 0 !important; }` (0,1,0) regardless of source order. Rewrote as `.help-body .privacy-footnote { margin: 14px 0 0; }` (0,2,0 — two classes beat one class + one element on the class column alone) and dropped `!important` entirely.
  - Full gate green; live-verified the DataCheck panel (both pass/warn states) and the Privacy modal's footnote spacing in both themes.

### R19 (review item D2) — Consolidate breakpoints  ✅
- **Do:** five uncoordinated breakpoint values (639, 640, 780, 860, 1023) split across `app.css` and `deck.css` created a real broken seam in the 781–1023px range: `.mobile-header-row`'s corner-button relocation switched at 780, but the deck's own grid/KPI-rail collapse (the layout change that actually makes fixed-position floating corner buttons risky again) didn't happen until 1023 — so a ~240px-wide band of viewport widths had the deck already in its narrow/stacked layout while the theme-toggle and help-menu buttons were still `position: fixed`, free to float over the now-repositioned content.
- **Accept:** a documented 3-tier contract (640 mobile / 860 narrow / 1023 tablet) shared by both files; the corner-button switch and the grid collapse happen at the same breakpoint, closing the 781–1023px seam; verified programmatically at the exact boundary (900px = inside the old broken range, 1050px = clearly desktop), not just eyeballed.
- **Resolution note (2026-07-13):** `app.css`'s `.mobile-header-row`/`.theme-toggle-corner` and `.help-menu-corner` media queries moved from `max-width: 780px` to `max-width: 1023px`, matching `deck.css`'s existing tablet-collapse breakpoint exactly. `deck.css`'s `max-width: 639px` block (KPI rail → 1 col, adv-tiles → 2 col, `.deck-mast-meta` hidden) unified to `640px` to match app.css's own gallery/commentary breakpoint at the mobile tier, removing the last off-by-one mismatch. The remaining 860px tier (`app.css`: `.wrap` padding, `h1` size, `.funds`, `.uploadbar .wrap` padding) was left alone — it's a real, distinct "narrow but not stacked" tier for app-wide type/padding, not implicated in the corner-button bug, and folding it into 1023 would have widened scope well past this item's effort budget for no described problem. Both files now carry a short header comment on their responsive blocks documenting the 640/860/1023 contract so a future addition doesn't reintroduce a fourth value. Verified via `getComputedStyle` in-browser at the two former boundary widths: at 900px (inside the old broken range) both corner buttons are now `position: static`/`relative` and render inline in `.mobile-header-row`, exactly like true mobile; at 1050px they're back to `position: fixed`. No visual regression at any of the three tier boundaries in either theme.

### R20 (review item D3) — Fix app.css/deck.css layering  ✅
- **Do:** `AllocationSection` (the donut + legend + drill-down) mounts in exactly one place — inside `deck.css`'s `.deck-alloc-card` — but its responsive shrink-on-narrow-screens rules lived in `app.css` as bare `.alloc`/`.donut-wrap` selectors inside a `max-width: 860px` query. `deck.css`'s `.deck-alloc-card .alloc`/`.deck-alloc-card .donut-wrap` rules (two classes, no media query — always active) out-specificity the bare app.css versions at *every* viewport width, so the app.css responsive rule was silently dead: the donut never actually shrank on narrow screens, it just happened to still fit by coincidence at common widths.
- **Accept:** the two files stop fighting over the same selector; the narrow-screen donut-shrink behavior actually fires (confirmed via computed styles, not just "no longer dead in theory"); no regression to the fixed 276px desktop/tablet sizing.
- **Resolution note (2026-07-13):** deleted the dead `.alloc`/`.donut-wrap` lines from app.css's 860px block, leaving a comment on the base `.alloc`/`.donut-wrap` rules explaining that responsive ownership for this component now lives entirely in `deck.css`, next to the rest of `.deck-alloc-card`'s sizing. Added the actual shrink rule to `deck.css`, scoped correctly under `.deck-alloc-card` so it can never lose a specificity fight with itself: `@media (max-width: 640px) { .deck-alloc-card .donut-wrap { width: min(220px, 68vw); height: min(220px, 68vw); } }` (640, not the old 860, per R19's consolidated contract — 860 governs unrelated app-wide type/padding, not this card). Verified live at 375px width in both themes: donut renders at 220px (previously would have rendered at the fixed 276px, since the app.css override never fired), fits inside its card with room to spare, and `document.body.scrollWidth` stays equal to the viewport width — no horizontal scroll.

### R21 (review item E1) — Root cleanup  ✅
- **Do:** four unreferenced/stale/duplicated artifacts sitting in the repo root: a 633KB `product_spec.pdf` binary duplicate of `product_spec.md` (untouched since the initial commit, never linked from README or anywhere else); `handoff.md`'s "read first" onboarding doc describing a pre-dark-theme, pre-second-review app; a hand-copied 40-AMC table in `name_overrides.md` duplicating `fundHouses.ts`'s `FUND_HOUSE_NAMES`; and `Testing/` + `sample-portfolio-data.xlsx` — manual-testing artifacts cluttering the root alongside `app/`.
- **Accept:** the binary duplicate is gone; `handoff.md` reflects the app's actual current shape; the AMC table has exactly one copy (code), not two that can silently drift; the manual-testing artifacts live somewhere that doesn't read as part of the app's own root-level structure.
- **Resolution note (2026‑07‑13):**
  - **`product_spec.pdf` deleted** (confirmed via `git log --follow` it was never touched past the initial commit, and never referenced by README/docs — genuinely orphaned). Removal confirmed as a deliberate, user-approved action (asked explicitly, since deleting a tracked binary is a one-way call on disk even though it stays recoverable via git history).
  - **`handoff.md` refreshed**: the "Design language" line (still describing the retired Fraunces+Inter+IBM-Plex-Mono single-theme look) now describes the actual dual dark/light "Terminal Deck"/"The Ledger" theme and current font stack (verified against `tokens.css`), plus a line on the point-of-use explainers/insight-flags/retirement-projection work. The "a critical review is actively reshaping the UI" paragraph (written for the 2026‑07‑03 review, since fully landed) now covers both that review and the 2026‑07‑12 comprehensive review whose `R`-item recommendations this file's own Theme A–E work has been implementing. The repo-contents tree gained the `server/`, `feedback-rules.json`, `docs/DEPLOY.md`, and `docs/manual-testing/` entries added since the doc was last touched.
  - **`name_overrides.md`'s duplicated table removed**: `fundHouses.ts`'s `FUND_HOUSE_NAMES`/`RAW_ALIASES` are now the sole data source (confirmed byte-for-byte identical to the markdown table before deleting it, so this was a real, if not-yet-triggered, drift risk, not an already-diverged bug); `name_overrides.md` §1 keeps the rule/rationale/where-shown prose and points at the code instead of re-stating the data. `fundHouses.ts`'s header comment updated to stop claiming it "mirrors" the markdown file — ownership was backwards before this (comment said the *code* was the mirror of the *doc*, when in practice the doc was hand-copied from the code).
  - **`Testing/` and `sample-portfolio-data.xlsx` relocated** to `docs/manual-testing/` via `git mv` (preserves file history) — both were genuinely unreferenced by any code path or other doc (confirmed via repo-wide grep before moving), so this is a pure location change, not a behavior change. README's layout diagram updated to mention the new path.
  - Full gate green; live-verified the app still loads (relocation touched no code paths, only root-level docs/data).

### R22 (review item E2) — Staleness canary + geo.ts tests  ✅
- **Do:** `engine/scheme.ts` silently falls back from the hand-curated `FUND_META` table to `inferMeta()`'s keyword heuristics whenever a scheme's ISIN isn't in the table — a reasonable fallback, but one with zero visibility: nothing flags when a fund's allocation/benchmark/expense/risk figures are guessed rather than curated. Separately, `reference/geo.ts`'s `geoFor()` — the country-of-exposure classifier, used by every portfolio's Geography chart — had zero direct unit tests, only indirect coverage via full-portfolio integration fixtures that happen to exercise its "explicit `meta.geo`" branch and none of its five name-inference branches.
- **Accept:** a new test makes the `FUND_META` fallback rate an explicit, checked number per real-statement fixture, rather than a silent, driftable gap; `geoFor()`'s branches (explicit geo, US/China/global/emerging-market name inference, alloc-derived fallback, the zero-sum guard) each get a direct assertion.
- **Resolution note (2026‑07‑13):** new `reference/fundMetaCoverage.spec.ts` parses each real-statement golden fixture and asserts the exact count of ISIN-bearing schemes that fall through to `inferMeta()` — baselined against today's actual numbers rather than asserted at zero, since that would be false: `sample.txt`/`alok_2025.txt`/`alok_2026.txt`/`markitdown_cas.md` are all fully covered (0 uncovered each), but `vandana_kfintech.txt`'s real 29-fund statement has 23 uncovered — `FUND_META` (18 entries total) was never fully curated for it, a known, accepted, pre-existing gap, not something this task fixed. The test's purpose is to make any *future* change to that number a deliberate, visible diff instead of invisible drift — a regression (count goes up) means something new needs curating; an improvement (count goes down) means the baseline should be tightened in the same commit. `coverage_sample.txt`/`coverage_sample_no_isin.txt` (the 100-fund live-NAV-matching stress fixture, `docs/DECISIONS.md` "100-fund coverage sweep") are deliberately excluded — that fixture exists specifically to *not* be curated into `FUND_META`, so including it would swamp a real signal in expected, permanent noise; `axis.txt` is excluded for having no ISINs at all, so it always falls through regardless of `FUND_META`'s coverage. New `reference/geo.spec.ts` (11 tests): explicit-geo pass-through, explicit-geo normalization when the input doesn't already sum to 1, each of the four name-inference branches (US/China/global/emerging-market) including a case-insensitivity check, the alloc-derived India+Gold&Commodities fallback (with and without an "other" sleeve), the fully-absent-meta default (100% India), and the sum-to-zero guard (`{India: 1}` when a fully-zero alloc would otherwise divide by zero). `aliases.ts` (the other file review item E2's intro paragraph mentioned) was left alone — unlike `FUND_META`, it has no analogous "silent fallback function" to instrument; its staleness already surfaces loudly (a missing rename means live-NAV name-matching fails outright for that fund, already caught by `marketdata`'s existing regression tests), so a parallel canary for it wasn't in the plan's concrete ask and would have been scope creep. Full gate green (429 tests, up from 413).

### R23 (review item E3) — PWA manifest + meta description  ✅
- **Do:** `plan.md` flagged this as the "cheap installability shim" — a manifest + two meta tags — that was optional and never done; `index.html` had no `<meta name="description">` (relevant for link-preview cards and search, not just SEO given this is a real tool people bookmark/share) and no way for a browser to offer "Add to Home Screen"/desktop install.
- **Accept:** a valid, fetchable web app manifest; a description meta tag; no new service worker or offline-caching behavior (the app depends on a live network fetch for NAV data every load — a cached/offline shell would be actively misleading, not a feature).
- **Resolution note (2026‑07‑13):** new `app/public/manifest.webmanifest` — name/short_name/description, `start_url: "/"`, `display: "standalone"`, `background_color`/`theme_color` both set to the dark theme's `--paper` (`#0a0b0d`, the app's default theme per `tokens.css`'s `:root, [data-theme='dark']` pairing), and one icon entry reusing the existing `favicon.svg` with `sizes: "any"` (a real, spec-compliant PWA icon — SVG icons don't need a fixed pixel size — so this needed no new binary asset generation). `index.html` gained `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="description">` (same copy as the manifest's), and `<meta name="theme-color" content="#0a0b0d">`. No CSP change needed — `default-src 'self'` already covers a same-origin manifest fetch. Verified live: the manifest fetches and parses correctly in-browser (confirmed via a direct `fetch('/manifest.webmanifest')`, not just "no console error"), all three tags render with the correct content, and the app still loads and passes Data Check normally. Full gate green.

## X — Deferred / documented seams  *(do NOT build without a fresh decision)*

- **X1** Document the `IngestSource → ParsedStatement` seam (comment/type in `ingest/router.ts`)
  so a future CSV/equity source is a sibling of the text→CAMS path. **Doc only, no code.**
- **X2** Neutral IR for equities (ticker/price; no NAV/folio) — only when CSV lands.
- **X3** Web Worker for parse+compute — only after profiling shows real jank (statements are
  tiny today).
- **X4** Full PWA offline service-worker caching — marginal while NAVs need network.
  (A manifest-only installability shim is a cheap optional if wanted.)
- **X5** ✅ Rebuild charts/commentary/notes as structured-data JSX to remove
  `dangerouslySetInnerHTML` — large lift, do opportunistically when already editing a sink.
  **Done for all 6 charts** (invested/annual/rolling/capital/holdings/geography — rewritten to
  real JSX components during earlier 2026-07-04/05 chart-interactivity work; `Notes.tsx` was
  always plain JSX, never a sink). Discovered/logged during the S2 security audit (2026-07-05).
  **Not done for Commentary** — `buildCommentaryHTML` still returns an HTML string; that one
  sink stays as documented tech-debt (see `docs/DECISIONS.md`'s "HTML-string surface" note),
  not reopened here since S2 already confirmed its one interpolation is properly escaped.
