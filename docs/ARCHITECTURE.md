# Architecture

`app/` is a Vite + React 19 + TypeScript app. The engine is **pure TypeScript modules** with
no DOM/`fetch` dependency, imported by React components that own rendering and network calls.
There is one implementation — no HTML prototype, no mirror (see `docs/DECISIONS.md`).

Data flow:

```
 input text ──► normalizeInput ──► parseStatement ──► analyzePortfolio ──► PF (portfolio object)
   ▲                                                        │  (+ live NAV map via resolveLiveNavs)
   │                                                        ▼
 PDF (pdf.js) / .md file / MarkItDown bridge             <App/> ──► section components + 6-chart gallery
   (src/ingest/)                                                │
                                                          runDataCheck / Commentary
```

## `app/src` layout

```
engine/       pure analysis: parsing→PF math, no DOM/fetch
parsing/      CAS text → Scheme[] (position-independent field extraction)
reference/    hand-curated fund metadata, name aliases, geography inference
marketdata/   live NAV fetch + cache + plausibility-gated resolution
ingest/       PDF/Markdown/MarkItDown → text, routed to the parser
charts/       SVG chart builders (return HTML strings) + the gallery carousel
features/     React components per dashboard section (allocation, holdings, houses,
              commentary, data-check, sources, summary, upload, notes)
ui/           small shared primitives (SortableTable) + app.css / tokens.css
format.ts     number/date formatting + escapeHtml (XSS hardening for HTML-string sinks)
App.tsx       top-level orchestration: ingest → analyze → fetch live → render sections
```

---

## Engine (`engine/`, `parsing/`, `reference/`)

Pure, no DOM, no `fetch`. Everything the analysis needs.

### Utilities
- `engine/money.ts`, `engine/dates.ts` — `parseNum`, `parseDate` (dd‑Mon‑yyyy), `yearsBetween`, `DAY_MS`, month names.

### Reference data (`reference/`)
- `fundMeta.ts` — `FUND_META` keyed by **ISIN**: `{ category, alloc:{equity,debt,cash,other}, geo?, benchmark, expense, launch, exit, amc, note }`. Hand‑curated for funds seen so far; **approximate**, and deliberately **not** being expanded further (tasks.md decision — this stays a core-view input, not a growing database).
- `aliases.ts` — `NAME_ALIAS_GROUPS` (known scheme renames), used by harmonisation.
- `geo.ts` — `inferMeta(name)` (fallback category/allocation from name keywords) and `geoFor(meta, name)` (country map: explicit `meta.geo`, else India for domestic equity/debt/cash + "Gold & Commodities" for the `other` sleeve, else keyword inference for overseas mandates). Normalised to sum 1.

### Parsing (`parsing/`)
- `normalize.ts` — `normalizeInput(text)`: **source‑agnostic** preprocessor. Drops Markdown table‑separator rows, flattens `| cell |` → spaces, strips MarkItDown's spliced rotated page‑footer (forward **and** character‑reversed). Idempotent on plain pdf.js text — *this is what makes MarkItDown‑md and pdf.js‑text parse identically.*
- `cas/fields.ts` — field‑level regexes (`RE_HOUSE`, `RE_FOLIO`, `RE_SCHEME`, `RE_ISINTOK` = `/\bINF[A-Z0-9]{9}\b/`, `RE_STAMP`, NAV/MV/closing/cost/txn patterns).
- `cas/scheme.ts`, `cas/transactions.ts`, `cas/parse.ts` — `parseStatement(text)` → `Scheme[]`, each `{ house, name, isin, folio, txns:[{date,units,amount,price,stamp}], nav, navDate, marketValue, closingUnits, costValue }`. **Position‑independent**: each field parsed by pattern, tolerant of merged/split lines in any order, wrapped ISINs, switches/stamp‑duty/segregated folios. Buys = units>0, sells = units<0 (switches net at portfolio level).

### Math (`engine/`)
- `xirr.ts` — bisection + Newton.
- `cagr.ts` — `weightedCAGR(buys, endValue, endDate, costOverride)`, remaining‑cost‑basis CAGR (avoids phantom losses on switched funds).
- `gains.ts` — per‑lot STCG/LTCG (`ltcgMonths`: 12 equity / 24 debt), realised gains.

### Name harmonisation & live‑matching helpers  *(critical — see `docs/DECISIONS.md`)*
- `harmonise.ts` — `normName`, `planKey` (direct/regular · growth/idcw), `coreTokens` (strips plan words; generically collapses `equity arbitrage`→`arbitrage`), `canonCore` (alias‑resolved via `reference/aliases.ts`), `liveKey = canonCore|planKey`, `rawCore` (no alias collapse — for rename *display* detection), `fuzzyLive(name, rows)` (same‑plan core‑token Jaccard ≥0.7), `isin0(s)` (fold letter **O → 0**, registrar vs AMFI ISIN spelling).
- `scheme.ts` — `navPlausible(nav, stmtNav)`: true unless `nav/stmtNav` is outside ⅓×–3× (rejects wrong‑fund matches).

### Analysis
- `scheme.ts` — `analyzeScheme(s, valDate, live)` → per‑fund result: MV, gains, per‑lot STCG/LTCG, realised, `cagr`, `navLive`, `navSource`, `liveName`, `active` (MV>0), `hasCostBasis`, `allocAmt`, `meta`, etc. Applies the live‑NAV override (already plausibility‑filtered upstream by `portfolio.ts`).
- `series.ts` — `buildPortfolioSeries(schemes, liveFor, valDate)` → time series for charts. Reconstructs value over time by **interpolating each fund's price between its transaction points and today's NAV**, tracking units held; **anchors to closing units so the endpoint ties out exactly to headline MV**. Produces `line` (invested vs value), `annual` (Modified Dietz per calendar year), `rolling` (monthly trailing‑1Y; expanding since‑inception for the first year), `drawdown` (from a chained sub‑period **TWR** index), `contrib` (net flow per year). Switches net out of contributions.
- `portfolio.ts` — `analyzePortfolio(text, opts)` → **PF**. `opts.live = { byIsin, byName, rows, source }`. Internally defines `liveFor(s)` = ISIN (raw **or** `isin0`) → `byName[liveKey]` → `fuzzyLive`, each **gated by `navPlausible`**. Returns totals, `unrealised`, `realised`, portfolio `xirr`, `allTimeReturn` (money‑weighted since inception), `inceptionDate/Years`, `alloc`, `geo`, `houses`, `funds`, `series`, live coverage/date; also `summariseHouses(funds)` for the AMC roll‑up.
- `datacheck.ts` — `runDataCheck(pf, diag)`: audit (coverage, reconciliation of holdings→headline, per‑fund flags).

---

## Market data (`marketdata/`) — the only network egress, prices only

- `sources/amfi.ts` — parses AMFI `NAVAll.txt` from the **right** (date/nav last; name may contain `;`), scans **all** ISIN tokens per row, indexes each under raw **and** `isin0` form; builds `byName[liveKey]` and a `rows[]` list for fuzzy matching. `looksLikeAmfi()` rejects truncated/garbage responses.
- `sources/captnemo.ts` — CORS‑native ISIN→NAV lookup against `mf.captnemo.in/nav/:isin` (no proxy needed). Tries the raw ISIN then `isin0(isin)`.
- `sources/mfapi.ts` — CORS‑native name‑search fallback (`mfapi.in`), no ISIN endpoint.
- `sources/yahoo.ts`, `proxies.ts` — thin‑coverage/proxy‑racing tier, **slated for removal** (tasks.md N1) as a public‑product liability; still present as of this writing.
- `cache.ts` — 180s in‑memory cache; `resolveLiveNavs(schemes, {force})` bypasses it when `force: true`.
- `resolve.ts` — orchestrates the sources into `{ live, diag }` (`diag` flags which source matched each fund), **gated by `navPlausible`** for every candidate. `liveSource` is built once from the diag flags (not accumulated per fund — see the regression note in `docs/DECISIONS.md`).
- Provenance recorded per scheme for the Data Sources panel (`features/sources/`).

Per `plan.md` §0 / `tasks.md` N1–N3, this layer is being simplified to a cached AMFI edge
function (primary) + captnemo/mfapi (fallback), with the proxy race and Yahoo tier deleted.

---

## UI (`features/`, `charts/`, `ui/`, `App.tsx`)

### Orchestration (`App.tsx`)
Ingest → `analyzePortfolio` (statement‑only first, for instant paint) → `resolveLiveNavs` →
re‑analyze with live → render section components. Mirrors the old `updateDashboard`/`render`
sequence, now as React state instead of DOM writes.

### Charts (`charts/`) — inline SVG, gallery carousel
`invested.ts`, `annual.ts`, `rolling.ts`, `capital.ts`, `holdings.ts`,
`geography.ts` each build one chart as an **HTML string** (ported near‑verbatim from the
original string‑builder logic, through `format.ts`'s `escapeHtml` for any statement‑derived
text). `ChartGallery.tsx` renders the 6 slides via scoped `dangerouslySetInnerHTML` with
prev/next/dots/swipe. Shared helpers in `scales.ts` (`_sx/_sy`, `niceStep/axisTicks`,
`inrUnit` — ₹/lakh/crore, `shortName`).

### Feature sections (`features/`)
- `allocation/` — donut + legend + drill (interactive React, not an HTML-string sink).
- `holdings/` — `HoldingsTable.tsx` (sortable via `ui/primitives/SortableTable.tsx`), `FundCards.tsx` (KIM/SID detail).
- `houses/` — AMC roll‑up table.
- `datacheck/` — `DataCheck.tsx` renders `runDataCheck`'s audit as a panel.
- `commentary/` — `commentaryText.ts` (string builder: age/retire → `z = retireAge − age` → horizon‑tailored bands, glide‑path explainer, portfolio assessment vs `PF.alloc`/`PF.geo`, Bogle/Boglehead lens + disclaimer) rendered by `Commentary.tsx` via `dangerouslySetInnerHTML`.
- `sources/` — Data Sources provenance panel.
- `upload/` — `UploadBar.tsx`: PDF (`ingest/pdf.ts`, pdf.js), `.md/.txt` file, and **"Convert PDF to Markdown"** → `MARKITDOWN_ENDPOINT` (`127.0.0.1:8765`, see `markitdown_server.py`) with a clear message if the bridge isn't running.
- `notes/` — methods/caveats panel.

`dangerouslySetInnerHTML` is used deliberately for the charts/commentary/notes sinks (ported
string‑builder HTML), always through `escapeHtml`; everything else is idiomatic React. See
`docs/DECISIONS.md` and `tasks.md` S2 for the audit of this surface.

---

## The PF object (what the UI consumes)

```
PF = {
  funds: [ analyzeScheme results ],        // each has active, marketValue, navLive, meta, ...
  totalValue, totalCost, unrealised, realised,
  xirr, allTimeReturn, portCagr, inceptionDate, inceptionYears,
  alloc: { equity, debt, cash, other },    // amounts (₹)
  geo:   [ { country, pct } ],             // sums to 1
  houses:[ { house, cost, value, hasCost } ],
  series:{ line, annual, rolling, drawdown, contrib, inception, valDate, inceptionYear },
  live, liveMatched, liveAsOf, liveSource, valDate
}
```
