# Build Plan — Indian Mutual‑Fund Portfolio Dashboard (from CAMS/KFintech CAS)

A production blueprint for the tool we prototyped: a **privacy‑first, browser‑based dashboard** that ingests a CAMS/KFintech Consolidated Account Statement (CAS) — as **MarkItDown‑converted Markdown** (primary) or a **PDF** (fallback) — and produces portfolio analytics: XIRR/CAGR, capital gains (STCG/LTCG), look‑through asset & country allocation, live‑NAV valuation, a charts gallery, an automatic data‑check, and age‑tailored commentary.

The guiding principle throughout: **the user's financial data never leaves their device unless they explicitly opt in.** Every architectural choice below flows from that.

---

## 0. Review Update & Locked Decisions (2026-07-03)

Phases 0–6 were built and verified in `app/` (React 19 + Vite + TS). A critical
overengineering review then reset direction. **The actionable work now lives in
[`tasks.md`](./tasks.md)** (workstreams C/N/U/A/S/T/D, plus deferred X); this blueprint below is
retained as reference. Locked decisions that override the original phases:

1. **`app/` is the single source of truth.** The `portfolio-dashboard.html` prototype and
   `reference/engine.js` mirror are being **retired** (Tasks C1–C3) — they caused the same bug
   to be fixed 3× and add no value now that `app/` has verified parity.
2. **Multi-format / CSV is TABLED.** Build no CSV/equity ingestion now; keep only a *documented*
   ingestion seam (Tasks X1–X2) so it can be added later without an architecture rewrite.
   Building it now would be the premature generalization this review exists to prevent.
3. **NAV: own cached AMFI edge function is now PRIMARY**, with CORS-native captnemo/mfapi as
   fallback (Tasks N1–N3). The public CORS proxies and the Yahoo tier are **deleted** — they're
   a production liability and per-ISIN hobby-endpoint hits don't scale. (This **reverses** the
   §1 "mfapi/captnemo primary, AMFI fallback" ordering below.)
4. **UI = lean-core default + a permanently-visible Portfolio Analysis section** (Tasks U1–U3):
   a quick glance by default; the 6-chart gallery, KIM/SID cards, provenance and data-check
   detail each open independently from a fixed row of section buttons (not one "advanced"
   toggle). **Layout locked (2026‑07‑04), revised same-day after first use ("Revision 2").**
   Current shape: the dashboard is dark **app-wide** (not just the deck); a masthead titled
   `«first name»'s Portfolio Summary` (privacy: first name only) with a Refresh button; a
   **full-width KPI row** (Total Value / Invested / "Total Gain / ST-LT Split" / "CAGR/XIRR" —
   the last two are richer than plain numbers, see below); a **2-column grid** — left: the
   Value-vs-Invested chart over a top-5 holdings table (Value/Total Gain/CAGR columns); right:
   a 240px Allocation donut + an Insight card ("Full Commentary →"). Below that, a permanent
   **"«first name»'s Portfolio Analysis"** card holds 6 buttons (6-Chart Gallery, Full Holdings,
   Fund Cards, Fund Houses, Data Sources, Method Notes), each independently opening/closing its
   own section (button flips white-bg/black-text while open). `DataCheck` sits **above** the
   whole deck, under the upload bar, always a one-line pass/fail headline linking into Data
   Sources for detail. The old single left-column KPI rail, 3-column grid, "XIRR" tile,
   "Unrealised" sub-label, and one-shot "Show Advanced" toggle are all superseded — see
   `tasks.md` §U's "Revision 2" note and each task's resolution note for the full detail and
   rationale. Dark token set, Title-Case labels, one font, tabular numerals still hold. The full
   spec + token values + responsive breakpoints are the contract in [`tasks.md`](./tasks.md) §U
   (U1–U3, U2a).
5. **Bar = public product** → accessibility, security/privacy, e2e and deploy stay in scope
   (Tasks A/S/T/D). BUT the **Web Worker and full PWA-offline items in Phase 7 are DEFERRED**
   as unmeasured gold-plating (Tasks X3–X4): statements are tiny, pdf.js is already off-thread,
   and NAVs need the network anyway. Profile before optimizing.
6. **In-app user feedback is a Cloudflare Pages Function forwarding to a webhook, not a database
   (2026-07-12, task D3).** The Feedback button's local companion server (`server/
   feedback-server.js`, SQLite) only ever works for the person running the app locally — a real
   deployed visitor's `127.0.0.1:8766` is their own machine, not the site owner's. Rather than
   standing up a hosted database + admin view, submissions are validated server-side, then
   forwarded to a Slack or Discord "Incoming Webhook" URL (site owner's choice, set as a
   Cloudflare secret) — same zero-infrastructure spirit as the rest of this project, and the site
   owner is notified the moment someone submits rather than needing to remember to check a log.
   Same "thin per-platform entry point around a plain Web-standard handler" shape as N2/D1's AMFI
   edge function. See `docs/DEPLOY.md` and `docs/DECISIONS.md` ("Production feedback: a Pages
   Function forwarding to a webhook").

---

## 1. Recommended tech stack

### Core decision: client‑side first
CAS PDFs contain a person's entire financial life (PAN, folios, holdings, transaction history). The most defensible design keeps parsing, computation, and storage **in the browser**, with the network used only for (public) NAV prices. This is also what makes the tool trustworthy enough for people to actually paste in their statement.

| Layer | Recommendation | Why |
|---|---|---|
| **Language** | **TypeScript** (strict mode) | Financial math and a messy parser both benefit hugely from a type system; `number` vs `NaN` bugs are the whole ballgame. |
| **Framework** | **React 18 + Vite** (primary) — *SvelteKit* a lean alternative | Component model for a growing UI, huge ecosystem, easy PWA. Svelte if bundle size is paramount. Keep the compute layer framework‑agnostic either way. |
| **Text extraction (primary)** | **MarkItDown** (Microsoft, MIT) — PDF → Markdown | Reconstructs the CAS's boxed/tabular regions more faithfully than raw PDF text extraction, so the downstream parse is cleaner and more robust. Runs as an **MCP tool** (e.g. Claude Desktop), a **CLI** (`markitdown file.pdf -o file.md`), or your own **edge function** — output is fed to the dashboard as text. Validated against real statements: reproduces engine totals to the rupee. |
| **Text extraction (fallback)** | **pdf.js** (Mozilla, Apache‑2.0) — in‑browser | Keeps a **zero‑dependency, fully in‑browser** path when MarkItDown isn't available (extracts positioned text runs reassembled into lines; handles password‑protected CAS). Same parser consumes its output. |
| **CAS parsing** | **Source‑agnostic normaliser + ported TS parser**; `casparser` (Pyodide or service) as an optional robustness path | A `normalizeInput()` step flattens Markdown tables back into lines so **MarkItDown‑Markdown and pdf.js‑text parse identically**. `casparser` (Python, MIT, actively maintained) remains the gold standard (ISIN/AMFI + 112A gains) if you want a heavier, battle‑tested parser — see §3. |
| **Domain / calculation engine** | **Pure TS module, zero DOM, zero deps** | XIRR (bisection+Newton), CAGR, Modified Dietz, capital‑gains lots, allocation roll‑ups. This is the crown jewel — keep it isolated and 100% unit‑tested. |
| **Market data (NAV)** | **mfapi.in** + **mf.captnemo.in** (both CORS‑enabled) as primary; **AMFI `NAVAll.txt`** via a cached serverless proxy or self‑hosted daily snapshot as fallback | Solves the prototype's biggest operational pain (see §3, "NAV data"). mf.captnemo.in does **ISIN → NAV** with `Access‑Control‑Allow‑Origin: *` and no logs. |
| **State** | **Zustand** (or React Context + reducers) | Portfolio state is small; avoid Redux ceremony. |
| **Charts** | **Hand‑rolled SVG** (keep the bespoke look) or **visx** (D3 primitives, React) | Recharts/Chart.js are fine for speed, but the prototype's inline‑SVG charts are dependency‑free, print‑clean, and on‑brand. visx if you want composability without the bloat. |
| **Local storage / cache** | **IndexedDB** via **Dexie** (or `idb`) | Cache the daily NAV file and (optionally, encrypted) the last parsed portfolio. No server DB in the privacy tier. |
| **Heavy work** | **Web Workers** (Comlink) | Run PDF parsing + XIRR off the main thread so the UI never janks. |
| **Styling** | **CSS variables + a small design‑token file** (or Tailwind if the team prefers) | Preserve the paper/ink palette and Fraunces/Inter/IBM Plex Mono type system as tokens. |
| **Testing** | **Vitest** (unit) + **Playwright** (e2e) + **golden‑file fixtures** | Regression‑lock the parser and engine against real, anonymised statements. |
| **Tooling** | ESLint + Prettier + Biome (optional), `tsc --noEmit` in CI | |
| **Build / deploy** | Static SPA + **PWA** on **Cloudflare Pages / Netlify / Vercel** | Offline‑capable, CDN‑fast, no server to secure in the base tier. |
| **Optional backend** | A single **edge function** (Cloudflare Workers / Vercel Functions) | Only for: (a) NAV proxy + daily cache, (b) *opt‑in* server‑side `casparser`. Stateless, ephemeral, no persistence. |

### What to deliberately avoid
- **No third‑party analytics / error trackers on any page that holds statement data** (or scrub aggressively — see §3).
- **No uploading the PDF to a third‑party parsing API by default.** A commercial option exists (`casparser.in`, which states it doesn't store data) but it should be strictly opt‑in, not the default path.
- **No `localStorage` for sensitive blobs** — use IndexedDB with optional encryption; never put PII in URLs.

---

## 2. File structure

A pnpm/Vite monorepo‑style layout that keeps the **engine and parser publishable and testable in isolation** from the UI.

```
portfolio-dashboard/
├─ package.json
├─ pnpm-workspace.yaml
├─ vite.config.ts
├─ tsconfig.json
├─ plan.md
├─ README.md
│
├─ public/
│  ├─ pdf.worker.min.js            # pdf.js worker (self-hosted, not CDN)
│  ├─ manifest.webmanifest         # PWA
│  └─ icons/
│
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  │
│  ├─ ingest/                      # get statement TEXT from any source
│  │  ├─ router.ts                 # picks source: .md/text → passthrough; .pdf → pdf.js
│  │  ├─ markitdown.ts             # accept MarkItDown Markdown (file / paste / MCP result)
│  │  └─ pdf.ts                    # pdf.js FALLBACK: file → positioned text lines
│  │
│  ├─ parsing/                     # statement text → structured statement
│  │  ├─ normalize.ts              # flatten md tables → lines (source-agnostic)
│  │  ├─ cas/
│  │  │  ├─ tokenize.ts            # line reconstruction (group by y, sort by x)
│  │  │  ├─ scheme.ts              # scheme headers, ISIN capture (incl. wrapped)
│  │  │  ├─ transactions.ts        # buys/sells/switches/stamp duty/segregated
│  │  │  ├─ fields.ts              # NAV / MV / closing units / cost (any order)
│  │  │  ├─ parse.ts               # orchestrator → Statement model
│  │  │  └─ fixtures.spec.ts       # golden tests: md AND pdf-text → identical output
│  │  └─ pyodide/                  # OPTIONAL robustness path
│  │     └─ casparserBridge.ts     # run Python casparser in a worker
│  │
│  ├─ engine/                      # pure domain logic (no DOM, no fetch)
│  │  ├─ types.ts                  # Statement, Scheme, Txn, Fund, Portfolio
│  │  ├─ dates.ts  ├─ money.ts     # parsing, INR lakh/crore, en-IN
│  │  ├─ xirr.ts   ├─ dietz.ts     # money- & time-weighted returns
│  │  ├─ gains.ts                  # STCG/LTCG lot matching (equity/debt rules)
│  │  ├─ scheme.ts                 # per-scheme analysis (+ live-NAV override)
│  │  ├─ portfolio.ts              # roll-up, allocation, geography, inception
│  │  ├─ series.ts                 # time series for charts (unit-anchored)
│  │  ├─ harmonise.ts              # name aliases, plan keys, fuzzy, ISIN O↔0
│  │  ├─ datacheck.ts              # post-parse audit & reconciliation
│  │  └─ *.spec.ts
│  │
│  ├─ marketdata/                  # the only network layer for prices
│  │  ├─ sources/
│  │  │  ├─ mfapi.ts               # search + latest + history (CORS)
│  │  │  ├─ captnemo.ts            # ISIN → NAV (CORS)
│  │  │  └─ amfi.ts                # NAVAll.txt via proxy/snapshot (fallback)
│  │  ├─ resolve.ts                # ISIN → alias name → fuzzy → plausibility gate
│  │  ├─ cache.ts                  # IndexedDB day-cache + TTL
│  │  └─ *.spec.ts
│  │
│  ├─ reference/                   # static, versioned metadata
│  │  ├─ fundMeta.ts               # category/alloc/geo/benchmark by ISIN
│  │  ├─ aliases.ts                # known scheme renames
│  │  └─ geo.ts                    # country-exposure estimates
│  │
│  ├─ state/
│  │  ├─ store.ts                  # Zustand: portfolio, status, settings
│  │  └─ persistence.ts            # optional encrypted IndexedDB snapshot
│  │
│  ├─ features/
│  │  ├─ commentary/               # age/horizon Bogle-lens commentary
│  │  │  ├─ commentary.ts          # bands, glide path, portfolio assessment
│  │  │  └─ Commentary.tsx         # collapsible section + inputs
│  │  ├─ datacheck/DataCheck.tsx
│  │  ├─ summary/  ├─ allocation/  ├─ holdings/  ├─ sources/
│  │  └─ upload/UploadBar.tsx
│  │
│  ├─ charts/                      # inline-SVG chart components
│  │  ├─ scales.ts  ├─ axes.tsx
│  │  ├─ InvestedVsValue.tsx  ├─ CalendarYearReturns.tsx
│  │  ├─ RollingReturns.tsx   ├─ Drawdown.tsx
│  │  ├─ CapitalByYear.tsx    ├─ HoldingsByValue.tsx
│  │  ├─ Geography.tsx
│  │  └─ Gallery.tsx               # carousel (prev/next/dots/swipe)
│  │
│  ├─ ui/                          # design system
│  │  ├─ tokens.css                # palette, type, spacing
│  │  ├─ primitives/               # Button, Card, Table (sortable), Input…
│  │  └─ format.tsx
│  │
│  └─ workers/
│     ├─ parse.worker.ts           # pdf.js + parser off main thread
│     └─ compute.worker.ts         # engine on large histories
│
├─ server/                        # OPTIONAL, stateless edge functions
│  ├─ nav-proxy.ts                 # cached AMFI fetch (CDN-cached, no logs)
│  ├─ markitdown.ts                # opt-in PDF → Markdown (ephemeral, no storage)
│  └─ parse.ts                     # opt-in casparser (ephemeral)
│
├─ tests/
│  ├─ fixtures/                    # anonymised CAS text + expected JSON
│  └─ e2e/
│
└─ .github/workflows/ci.yml
```

**Key idea:** `parsing/`, `engine/`, and `marketdata/` are pure modules with no React imports. They could be published as an npm package and reused in a CLI or a server. The UI is a thin shell over them.

---

## 3. Design considerations

### Privacy & security (the non‑negotiable)
- **Client‑side by default.** Extract → parse → compute → render all happen locally: **MarkItDown runs on the user's own machine** (the MCP tool in Claude Desktop, or the CLI), and pdf.js runs in the browser. The network touches only public price endpoints. The only paths that send statement data off‑device are the **opt‑in** MarkItDown/casparser edge functions — clearly disclosed, ephemeral, no storage.
- **No PII egress.** NAV lookups send a scheme name or an ISIN — never folio numbers, PAN, amounts, or the PDF. Treat scheme names as low‑sensitivity but still prefer ISIN lookups.
- **Opt‑in only for any server path** (server‑side parsing, cloud sync). Make the data‑flow visible in the UI.
- **Optional at‑rest encryption** for the saved snapshot (WebCrypto, passphrase‑derived key). Default to *not* persisting.
- **Strict CSP**, self‑hosted pdf.js worker (no CDN execution), Subresource Integrity on any remaining CDN assets.
- **Observability without leakage:** if you add error reporting, run it only on non‑data routes, or hard‑scrub — never send parsed values, file contents, or scheme lists.

### Correctness & trust
- **Golden‑file testing** is the backbone: keep a library of anonymised real statements (both CAMS and KFintech layouts, old and new) with expected engine output, and fail CI on any drift.
- **Reconciliation checks** shipped to the user (the *data‑check* feature): every visible holding must sum to the headline value; every held fund should resolve a NAV; flag anything that doesn't *before* showing numbers.
- **Show your work / provenance:** per‑fund "NAV source" (AMFI/mfapi/statement) and a methods section. Users trust numbers they can trace.

### Extraction & parsing strategy (hard‑won lessons from the prototype)

**Extraction — pdf.js is the permanent default; MarkItDown is a conditional fallback (locked 2026‑07‑05, see tasks.md U4 / docs/DECISIONS.md).** This section originally said "MarkItDown primary, pdf.js fallback" — that was never what shipped, and a review confirmed why it shouldn't be: MarkItDown needs a locally‑running Python bridge (or the Claude Desktop MCP tool), which conflicts with the "quick, easy, non‑expert" mission (§0). There's also no LLM/token cost in this pipeline either way — both extractors are 100% local — so the real trade‑off is parsing *robustness* (MarkItDown reconstructs the CAS's boxed/tabular regions more cleanly; raw PDF text extraction is what fragments those tables and wraps ISINs onto the next line) against *zero‑setup*. The locked flow:

1. **Default — pdf.js in the browser.** Drop the PDF and extract text locally (positioned runs → reassembled lines) with no setup at all. Zero dependencies, nothing leaves the device.
2. **Conditional fallback — MarkItDown → Markdown**, surfaced only when `engine/extractionQuality.ts` detects the extraction actually went wrong (not as a parallel default choice). Obtain it via the local bridge (`markitdown_server.py`), the Claude Desktop MCP tool, or the CLI. The dashboard accepts the Markdown as a `.md` file, a paste, or a passed string.

Both routes feed the **same** parser. A `normalizeInput()` step drops Markdown table‑separator rows and flattens `| cell | cell |` back into space‑separated lines, so **MarkItDown‑Markdown and pdf.js‑text produce byte‑for‑byte identical parsed output** (validated on real statements: totals match to the rupee). Note MarkItDown can drop spaces inside justified *prose* (boilerplate) — harmless for the tabular data the parser reads, but golden tests should assert on parsed numbers, not raw text.

**Parsing — same robustness rules regardless of source:**
- **Never position‑fragile.** Parse each field independently by pattern, not by fixed column/line offsets. CAMS and KFintech differ.
- **Handle both layouts:** NAV/MV/closing‑units/cost either merged on one line or split across lines, in any order.
- **Segregated portfolios, switches, stamp duty, reversals** all appear — model transactions generically (signed units + amount) so switches net out at the portfolio level.

**Which parser engine:**
- *Ported TS parser* (**default**): zero server, max privacy, feeds off normalised text from either extractor; you own maintenance as formats change.
- *Pyodide + `casparser`* (optional): run the battle‑tested Python parser in‑browser (pdfminer backend is pure‑Python and Pyodide‑compatible). Cost: a multi‑MB WASM download, lazy‑loaded on first parse.
- *Self‑hosted `casparser` / MarkItDown service* (optional): most robust, but data leaves the browser → **opt‑in, ephemeral, no storage, clearly disclosed**.
- **Recommendation:** ship the TS parser fed by MarkItDown (primary) / pdf.js (fallback); keep Pyodide/casparser behind a "having trouble? try the robust parser" opt‑in. Reserve the commercial parsing API for a B2B tier only.

### Name changes, ISINs & wrong‑fund matching (the subtle bugs)
- **ISIN is the primary key** (stable across renames) — but registrar vs AMFI spellings differ on **letter‑O vs zero‑0**; fold `O→0` and index both.
- **Alias‑resolved, plan‑aware name matching** for renames ("Equity Arbitrage" → "Arbitrage"), with a generic collapse for the sweeping SEBI‑era renames, plus a fuzzy core‑token fallback.
- **Plausibility gate:** only accept a live NAV within a sane band (⅓×–3×) of the statement NAV; a wildly different value means a wrong‑fund match — reject it and *rescue* via the next source rather than corrupting the valuation.
- Prefer **CORS‑enabled, ISIN‑capable NAV sources** so most of this happens by ISIN and never needs fuzzy matching.

### NAV data layer
- The prototype's fragility came from **AMFI's `NAVAll.txt` having no CORS headers**, forcing unreliable public proxies. Fix it structurally:
  - **Primary:** `mfapi.in` (CORS, search + `/latest`, carries ISIN) and `mf.captnemo.in` (CORS, ISIN → NAV, no logs).
  - **Fallback:** AMFI `NAVAll.txt` through **your own cached edge function** (fetched once/day server‑side, served CORS‑enabled to all users) — reliable and still price‑only.
  - **Cache** the day's NAVs in IndexedDB; refresh on demand.
  - Validate completeness (reject truncated files by checking ISIN‑token count) and race sources, taking the first valid response.

### Performance
- Web Workers for parse + compute; lazy‑load Pyodide/charts; virtualise long transaction tables; memoise the engine on a content hash of the statement.
- Charts as static SVG render instantly and print well.

### UX, accessibility, i18n
- **Indian number formatting** (lakh/crore), en‑IN dates, ₹ throughout.
- Keyboard‑navigable carousel and sortable tables; ARIA on interactive controls; WCAG‑AA contrast in the paper/ink palette.
- Responsive down to phone widths; the gallery is swipeable.
- Clear empty/error/loading states, and a visible "valued as of / live vs statement" banner.

### Regulatory / advice boundary
- The commentary is **educational, rules‑of‑thumb** guidance (Bogle/Boglehead lens), explicitly **not** personalised advice. Keep the SEBI‑registered‑adviser disclaimer, and never present it as a recommendation to buy/sell a specific security.

### Extensibility (roadmap hooks)
- Merge **multiple statements** over time (dedupe by folio+txn); support **NSDL/CDSL demat** CAS (equities, bonds, NPS) later; multi‑currency for overseas sleeves; export (CSV/PDF report); scenario/glide‑path simulator.

---

## 4. Step‑by‑step implementation plan

Phased so that a **thin end‑to‑end slice works early** and every phase ships something testable. Rough sizing assumes one focused developer.

### Phase 0 — Scaffold & guardrails (½ week) — **done 2026‑07‑03**, see `app/`
1. ✅ `npm create vite` → React 19 + TS (strict); oxlint (ESLint‑equivalent, faster) + Prettier; Vitest; CI (`tsc`, lint, unit) at `.github/workflows/ci.yml`. Playwright **not yet set up** (no UI to drive yet — Phase 4).
2. ✅ Design tokens (`app/src/ui/tokens.css`, ported from the HTML `:root`). UI primitives **not yet started** — `App.tsx` is a placeholder shell.
3. ✅ Golden‑fixture harness: fixtures copied to `app/tests/fixtures/`, expected totals in `app/tests/fixtures/expected.ts`, asserted in `app/src/parsing/cas/fixtures.spec.ts`. **Caveat:** this Phase‑0/1 version checks the parser's own per‑scheme `marketValue`/`closingUnits`/`nav` fields, not a full `analyzePortfolio()` total — that gate lands with the Phase 2 engine port.
4. ⬜ PWA manifest + strict CSP — not yet done. Self‑hosted pdf.js worker **is** done (see Phase 1 below), via Vite's `?url` import rather than a `public/` copy — verified against real network requests in a browser (`localhost`, not a CDN).

### Phase 1 — Ingestion & parser (1–1.5 weeks) — **done 2026‑07‑03**, see `app/src`
5. ✅ `app/src/ingest/{router,markitdown,pdf}.ts` — router + three entry points (MarkItDown `.md` file, pasted text, PDF via pdf.js). PDF path is dynamically `import()`-ed (lazy) rather than a static import, since it needs browser‑only APIs (`DOMMatrix`) that jsdom/Vitest can't provide and most sessions won't touch it (MarkItDown is primary).
6. ✅ `app/src/parsing/normalize.ts` — direct port of `normalizeInput`.
7. ✅ Implemented as `app/src/parsing/cas/{fields,scheme,transactions}.ts` (independent pattern‑based extractors) + `parse.ts` (the stateful orchestrator). No separate `tokenize.ts`: line reconstruction from positioned PDF runs lives in `ingest/pdf.ts` (it's an ingest concern, not a parsing one, in this codebase's actual boundary) — `parsing/` starts from already-line-broken text, same as the HTML engine.
8. ✅ Golden tests across all 5 existing fixtures + MarkItDown/pdf.js parity — passing. **KFintech‑registrar fixture still outstanding** (tracked separately in `handoff.md` next steps) — Phase 1's "both CAMS and KFintech" gate is only as complete as the fixture set.
9. ⬜ Pyodide/casparser bridge stub — not started (optional per plan).

### Phase 2 — Calculation engine (1.5 weeks)
9. `dates/money` helpers (en‑IN, lakh/crore, robust number parsing).
10. `xirr`, `dietz`, `gains` (equity 12‑mo / debt 24‑mo holding rules, per‑lot LTCG/STCG), `scheme` (per‑scheme analysis with statement NAV), `portfolio` (roll‑up, allocation, inception, all‑time money‑weighted return).
11. Unit tests for each with known‑answer cases; **golden** portfolio‑level totals vs fixtures. **Gate:** statement‑only totals exact.

### Phase 3 — Market‑data & live valuation (1 week)
12. `sources/mfapi` + `sources/captnemo` (CORS, direct); `sources/amfi` behind the cached edge function.
13. `resolve.ts`: ISIN (raw + O↔0) → alias name key → fuzzy → **plausibility gate**, with mfapi/captnemo **rescue** for gaps/implausible matches.
14. IndexedDB day‑cache; "Refresh" to force; graceful fallback to statement NAV with per‑fund provenance.
15. Wire live NAVs into the engine (recompute MV, gains, XIRR, allocation as of the latest NAV date). **Gate:** legitimate matches accepted, wrong‑fund matches rejected (regression tests with decoys).

### Phase 4 — Core UI & charts (1.5–2 weeks)
16. Upload bar (drag‑drop + browse + password), summary band, valuation banner, live/statement tags.
17. Interactive allocation donut + drill‑down; **sortable** "every scheme" and "AMC" tables (numeric desc/asc, text A↔Z, pinned total); per‑fund cards; Data Sources.
18. `series.ts` (unit‑anchored so the value curve ties out to headline MV) + the **charts gallery**: Invested‑vs‑Value, Calendar‑Year Returns, Rolling 1‑Year, Drawdown (TWR‑based), Net Capital by Year, Holdings by Value, **Geographical Concentration**. Carousel with arrows/dots/swipe.

### Phase 5 — Commentary & geography (½–1 week)
19. `reference/geo.ts` country‑exposure estimates + portfolio geography roll‑up.
20. Collapsible **Portfolio Commentary**: Age + Target‑retirement‑year inputs → years‑to‑retirement → horizon‑tailored bands, glide‑path explainer, portfolio assessment, Bogle/Boglehead lens + references + disclaimer. Verify a 30‑ vs 50‑year‑old produce materially different output.

### Phase 6 — Data‑check & hardening (½ week)
21. `datacheck.ts` + panel: after every load/refresh, audit coverage, reconcile holdings→headline, flag any fund on statement NAV with the reason; auto‑rescue where possible **before** displaying.
22. Exited/zero‑balance folios hidden from views but retained in realised gains & since‑inception return.

### Phase 7 — Performance, offline, polish (½–1 week)
23. Move parse + compute into workers (Comlink); lazy‑load charts/Pyodide; memoise on statement hash.
24. PWA offline (app shell + cached NAVs); loading/empty/error states; accessibility pass (keyboard, ARIA, contrast).

### Phase 8 — Testing, docs, launch (½–1 week)
25. Playwright e2e: upload sample → live refresh → sort → open commentary → navigate charts; offline path.
26. Threat‑model review (CSP, no‑egress verification, dependency audit); privacy note + methods docs in‑app.
27. Deploy static PWA to Cloudflare/Netlify/Vercel; ship the NAV edge function and the feedback
    webhook edge function (§0.6); set up preview deploys.

### Phase 9 — Roadmap (post‑launch)
28. Multi‑statement merge over time; NSDL/CDSL demat support; CSV/PDF export; encrypted local save + optional E2E‑encrypted sync; glide‑path scenario simulator; publish `engine` + `parsing` as an open‑source npm package.

---

## Reference implementation

The single‑file HTML prototype we built (`portfolio-dashboard.html`) already implements Phases 1–6 end‑to‑end and is the **living spec** for this plan: **MarkItDown‑Markdown / PDF / pasted‑text ingestion with the `normalizeInput()` flattener**, the parser rules, the XIRR/Dietz/gains math, the harmonisation + plausibility logic, the seven charts, the data‑check, and the commentary all exist and are validated against real statements (MarkItDown output reproduces engine totals exactly). Productionising is mostly **extracting those pure modules into `ingest/` + `parsing/` + `engine/`, wrapping them in React + workers, and hardening the NAV layer** with CORS‑native sources.

## References (verify before relying on any single source)
- casparser (Python, MIT) — https://github.com/codereverser/casparser · https://pypi.org/project/casparser/
- CASParser commercial API (opt‑in, B2B) — https://casparser.in/
- mfapi.in (free, CORS NAV API) — https://www.mfapi.in/ · docs https://www.mfapi.in/docs/
- mf.captnemo.in (ISIN → NAV, CORS, no logs) — https://mf.captnemo.in/
- mfdata.in (NAV + holdings/ratios) — https://mfdata.in/
- AMFI daily NAV file — https://www.amfiindia.com/spages/NAVAll.txt
- MarkItDown (primary extractor; PDF → Markdown, MIT) — https://github.com/microsoft/markitdown
- pdf.js (in‑browser fallback extractor) — https://mozilla.github.io/pdf.js/
- Bogleheads wiki (commentary grounding) — Asset allocation, Glide paths, Three‑fund portfolio: https://www.bogleheads.org/wiki/

*Note: NAV endpoints and parsing libraries change; treat the above as a starting map and re‑verify availability, CORS behaviour, rate limits, and licences at build time.*
