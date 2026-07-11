# PRODUCT SPECIFICATION DOCUMENT (PRD)
## Project Name: Portfolio Dashboard — Indian Mutual-Fund CAS Analyzer

**Date:** 2026-07-04
**Author / Product Owner:** Amay Narayan (Product Owner & Lead Maintainer)
**Version:** 1.0.0
**Status:** As-built specification of the shipped `app/` implementation, with forward-looking non-functional targets clearly marked.

> **How this document relates to the others**
> - **`product_spec.md` (this file)** — the single source of truth for *what the product is and does today*, plus the quality bar it must meet.
> - **`plan.md`** — the historical build blueprint and the 2026-07-03 architectural review (§0 locked decisions). Retained for rationale; not a description of current behaviour.
> - **`tasks.md`** — the forward-looking, numbered task tracker and progress checklist (the source of truth for *status and what's next*).
> - **`docs/ARCHITECTURE.md` · `docs/DECISIONS.md` · `docs/TESTING.md`** — module map, decision/bug-fix log with invariants, and the test strategy.

---

## Table of Contents

1. [Executive Summary & Objectives](#1-executive-summary--objectives)
2. [User Personas & Core Journeys](#2-user-personas--core-journeys)
3. [Functional Requirements (Scope & Features)](#3-functional-requirements-scope--features)
4. [Non-Functional Requirements (NFRs)](#4-non-functional-requirements-nfrs)
5. [Technical Architecture & Data Strategy](#5-technical-architecture--data-strategy)
6. [UI/UX & Design System Guidelines](#6-uiux--design-system-guidelines)
7. [Release Plan, Milestones & Risk Management](#7-release-plan-milestones--risk-management)
8. [Guardrails — What This Product Must NOT Do](#8-guardrails--what-this-product-must-not-do)
9. [Glossary](#9-glossary)

---

## 1. Executive Summary & Objectives

### 1.1 Project Overview

**Portfolio Dashboard** is a **privacy-first, browser-based web application** that turns an Indian **CAMS / KFintech Consolidated Account Statement (CAS)** into a complete mutual-fund portfolio analysis — returns (XIRR / CAGR), capital-gains split (STCG / LTCG), look-through asset and geographic allocation, live-NAV revaluation, a benchmarked comparison against the Nifty 50, a visual chart gallery, an automatic data-integrity check, and age-tailored educational commentary.

Its defining architectural property is that **the user's financial statement never leaves their device.** Parsing, computation, and rendering all happen client-side in the browser. The network is touched **only** to fetch public NAV (Net Asset Value) prices, and those requests carry a scheme name or ISIN — never a PAN, folio number, holding, or amount.

The core value proposition: **a trustworthy, zero-friction "upload and understand" experience** — a retail investor drops their consolidated statement and, within seconds, sees a professional-grade read of their portfolio that a spreadsheet cannot produce and that a commercial service would require them to surrender their data to obtain.

### 1.2 Problem Statement

Indian retail mutual-fund investors face a specific, well-defined set of pain points:

| # | Pain Point | Consequence Today |
|---|---|---|
| P1 | The CAS PDF is dense, tabular, and unfriendly — dozens of schemes, hundreds of transactions, no computed returns. | Investors cannot easily answer "how am I actually doing?" |
| P2 | Accurate **money-weighted return (XIRR)** across many contribution dates is effectively impossible by hand or in a naive spreadsheet. | Investors rely on the misleading value ÷ cost ratio, which understates return for portfolios funded over time. |
| P3 | **Capital-gains** (STCG vs LTCG, per-lot, with the 12-month equity / 24-month debt threshold) are tedious and error-prone to compute manually. | Tax planning is guesswork. |
| P4 | Commercial portfolio analyzers require **uploading the full statement (PAN, folios, holdings) to a third-party server.** | A genuine privacy and data-security risk that deters the privacy-conscious. |
| P5 | There is no easy, honest **benchmark comparison** ("did I beat a simple Nifty 50 index fund?") tied to the investor's own cash-flow timing. | Investors cannot judge whether active choices added value. |
| P6 | Generic robo-advice ignores the investor's **horizon** (years to retirement). | One-size-fits-all guidance that doesn't fit. |

### 1.3 Target Audience

**Primary users**
- **The self-directed Indian retail investor** — holds mutual funds across AMCs via CAMS/KFintech, receives the periodic CAS by email, is comfortable dropping a file into a web page, and is privacy-conscious enough to value that nothing is uploaded.

**Secondary users**
- **The financially literate "power" investor / DIY financial planner** — wants XIRR, per-lot capital gains, rolling returns, and benchmark comparison without exporting data to a commercial tool.
- **Family "portfolio helper"** — a more technical family member reviewing a relative's consolidated statement on their behalf, locally.

**Explicit non-audience (v1.0):** institutional users, advisers managing many client books, demat/equity (NSDL/CDSL) holders, and non-Indian market portfolios. See §3 MoSCoW "Won't Have".

### 1.4 Success Metrics (KPIs)

| Category | Metric | Target |
|---|---|---|
| **Correctness** | Golden-fixture statement-only totals reconcile to the rupee across all bundled fixtures | 100% (CI-enforced) |
| **Correctness** | Live-NAV portfolio total within plausibility band of statement total | 100% of held funds pass the ⅓×–3× gate or fall back with a stated reason |
| **Performance** | Time to first meaningful paint (statement-only analysis, no network) on a mid-range laptop | < 1.5 s |
| **Performance** | Time to fully revalued dashboard (live NAV + benchmark resolved) | < 4 s on a typical connection |
| **Privacy** | Outbound requests carrying statement PII (PAN / folio / amounts / the PDF itself) | **Zero** (must be verifiable — NFR S3) |
| **Reliability** | Graceful degradation: a fund whose live NAV can't be fetched still renders on statement NAV with a labelled reason | 100% (no blank/NaN cells) |
| **Trust** | Every displayed valuation is traceable to a named source (live / statement) in the Data Sources panel | 100% of funds |
| **Quality** | Automated test suite green on every change | 157/157 passing (current baseline) |
| **Accessibility** | WCAG 2.1 AA on the default (lean) view | Target for v1.1 (workstream A) |

---

## 2. User Personas & Core Journeys

### 2.1 Personas

#### Persona A — "Priya", the Privacy-Conscious Retail Investor (Primary)
- **Profile:** 34, salaried, invests monthly via SIPs across 6–8 funds and 3 AMCs. Receives the CAMS CAS email quarterly.
- **Goals:** Know her real return, understand her equity/debt mix, see whether she's beating a plain index fund, get a plain-English read on whether her allocation fits her age — all without handing her financial life to a website.
- **Frustrations:** Doesn't trust "upload your statement" services. Finds the raw CAS impenetrable. Doesn't know her XIRR. Isn't sure if her allocation is age-appropriate.
- **What success looks like for her:** Drops the PDF, immediately sees "You're balanced with 61% equity… XIRR 7.1% vs Nifty 50 −0.7%", and trusts it because nothing left her browser.

#### Persona B — "Rahul", the DIY Power Investor (Secondary)
- **Profile:** 41, engineer, tracks everything in spreadsheets, holds 25+ schemes including switched/renamed funds.
- **Goals:** Per-lot STCG/LTCG for tax planning, rolling 1-year returns, per-AMC concentration, provenance for every NAV, the ability to audit the methodology.
- **Frustrations:** Spreadsheets can't do XIRR across many dates or per-lot gains cleanly; commercial tools are black boxes.
- **What success looks like for him:** Opens "Full Holdings", "Fund Houses", "Method Notes", and "Data Sources"; confirms the numbers tie out and the methodology is documented.

#### Persona C — "The Maintainer" (Operator / Developer)
- **Profile:** Maintains and extends the app; there is **no runtime administrator** because there is no server or account system.
- **Goals:** Add new statement fixtures, keep the parser tolerant of new CAS layouts, keep the NAV layer reliable, ship the deferred hardening (a11y, security, deploy) without regressing the golden totals or the privacy invariants.
- **Frustrations:** Silent data-source drift (a benchmark fund that quietly stopped reporting); display bugs a green test suite doesn't catch.

### 2.2 Core User Journeys

#### Journey 1 — First-Use / Onboarding (Priya)
1. Priya opens the app URL. It **loads a bundled sample statement immediately** so the dashboard is never empty on arrival.
2. She sees the **Command Deck**: a data-check headline, her (sample) portfolio summary, KPI tiles, a value-vs-invested chart, top holdings, and an allocation donut.
3. She drags her own CAS **PDF** onto the upload bar. It is parsed **in her browser** (pdf.js); the dashboard repaints with statement-only figures within ~1 second.
4. In the background the app fetches **live NAVs** and the **Nifty 50 benchmark**; the tiles upgrade to current valuations with a "Live NAV" tag and an "as of" date.
5. The **Data Check** headline confirms "all N holdings valued on live NAVs" (or names the exceptions).
- **Acceptance:** No blank state; statement PII never transmitted; live upgrade is non-blocking.

#### Journey 2 — Core Workflow: Understand & Benchmark (Priya)
1. Priya reads the KPI rail: **Total Value / Invested**, **Total Gain with ST-LT split**, **XIRR (All-Time) and (1Y) each with the Nifty 50 figure beneath**, and an **Insight** summary.
2. She clicks **Full Commentary**, enters her **age** and **target retirement age**; the commentary tailors its glide-path guidance to her computed years-to-retirement.
3. She taps an allocation slice to drill into the funds contributing to Equity/Debt/Cash/Other.
- **Acceptance:** XIRR and benchmark are visibly comparable; commentary materially changes with age; drill-down is keyboard- and pointer-accessible.

#### Journey 3 — Deep Audit (Rahul)
1. Opens **Portfolio Analysis** and selects **Full Holdings** → per-scheme value, gain, and CAGR. Selecting another section replaces it (accordion); **View All** expands everything at once.
2. Opens **6-Chart Gallery** and steps through Invested-vs-Value, Calendar-Year Returns, Rolling 1-Year, Net Capital by Year, Holdings by Value, and Geography.
3. Opens **Data Sources** to confirm every NAV's provenance and the per-fund data-check status; opens **Method Notes** to audit methodology.
- **Acceptance:** Numbers reconcile to the headline; every NAV is attributed; methodology (including the Nifty 50 proxy caveat) is disclosed.

#### Journey 4 — Degraded / Offline (both)
1. The network is unavailable or a NAV endpoint fails.
2. The app **still renders** using statement NAVs; the Data Check panel names each fund on statement NAV and why; the benchmark comparison is **left blank rather than guessed**.
- **Acceptance:** No crash, no NaN, no misleading stale figure presented as current.

---

## 3. Functional Requirements (Scope & Features)

### 3.1 Feature Breakdown (as-built)

#### F1 — Ingestion (three routes, one parser)
- **PDF** dropped/selected → extracted in-browser via **pdf.js** (positioned text runs → reassembled lines).
- **MarkItDown `.md`** file or **pasted text** → passthrough.
- **"Convert PDF to Markdown"** → posts the PDF to a **local** MarkItDown bridge (`127.0.0.1:8765`, `markitdown_server.py`) that runs on the user's own machine; returns Markdown to the same parser.
- A source-agnostic `normalizeInput()` flattens Markdown tables so all three routes parse **identically**.

#### F2 — CAS Parsing (CAMS + KFintech)
- Position-independent, pattern-based extraction of schemes, folios, ISINs (including wrapped and O↔0-variant ISINs), NAV/market-value/cost/closing-units in any order, and every transaction (buys, sells, switches, stamp duty, segregated folios).
- Extracts the **account-holder name** for the personalised masthead (first name only, privacy).

#### F3 — Analytics Engine (pure, no DOM / no network)
- **Returns:** per-fund and portfolio **XIRR** (money-weighted, all-time), **trailing 1-year XIRR** (money-weighted, 12-month window with a synthetic start-of-window value), weighted **CAGR**, **Modified-Dietz** calendar-year and rolling 1-year returns, since-inception money-weighted return.
- **Capital gains:** per-lot **STCG/LTCG** (12-month equity / 24-month debt threshold), realised gains from round-trips.
- **Allocation:** look-through **Equity / Debt / Cash / Other** roll-up from curated fund metadata; **geographic** concentration estimate.
- **Roll-ups:** per-AMC ("Fund Houses"), inception date/span, exited-folio handling (hidden from holdings, retained in realised gains and since-inception return).

#### F4 — Live-NAV Valuation
- Resolves each holding's latest NAV via **mf.captnemo.in** (ISIN, CORS-native) and **mfapi.in** (name search, CORS-native); **AMFI `NAVAll.txt`** is the intended primary via a cached edge function (deferred — see §7 / tasks N2–N3).
- **Plausibility gate:** a candidate NAV outside ⅓×–3× of the statement NAV is rejected as a wrong-fund match and rescued from the next source, or the fund falls back to statement NAV with a stated reason.
- Revalues market value, gains, XIRR, and allocation to the latest NAV date. 180-second in-memory cache; **Refresh** forces a refetch.

#### F5 — Nifty 50 Benchmark Comparison
- Fetches a real, low-cost, direct-plan, growth-option **Nifty 50 index fund's full NAV history** from mfapi.in as a **disclosed proxy** for the index (no reliable public raw-index API exists).
- Filters near-miss variants (Next 50, equal-weight, quality, value); **skips stale/wound-up schemes** (recency check) and, among still-reporting candidates, prefers the **longest history** so older portfolios' all-time window isn't clipped.
- Computes the benchmark's CAGR over the portfolio's all-time span and over the trailing year; displays beneath the portfolio's own XIRR figures. Left **blank when no confident match** — never guessed.

#### F6 — Data Check (trust surface)
- After every load/refresh, audits coverage and reconciles holdings → headline value; renders a single concise **pass/fail headline** above the deck with a link into **Data Sources** for the per-fund breakdown.

#### F7 — Educational Commentary
- Collapsible; takes **age** and **target retirement age** → **years-to-retirement = retirementAge − age** → horizon-tailored equity-band guidance, a glide-path explainer, and a portfolio assessment through a Bogle/Boglehead lens, with book/wiki references and a **SEBI-RIA "not personalised advice" disclaimer.**

#### F8 — Visualisation & Tables
- **6-Chart Gallery** (carousel): Invested-vs-Value, Calendar-Year Returns, Rolling 1-Year, Net Capital by Year, Holdings by Value, Geography.
- **Allocation donut** with click/tap drill-down; **sortable** Full Holdings and Fund Houses tables; **Fund Cards** with KIM/SID detail; **Data Sources** provenance; **Method Notes**.

### 3.2 MoSCoW Prioritization Matrix

| Priority | Requirement | Rationale / Status |
|---|---|---|
| **Must Have** | Client-side CAS parsing (CAMS + KFintech), zero statement egress | Core privacy promise — **built** |
| **Must Have** | XIRR (all-time + 1Y), CAGR, STCG/LTCG, look-through allocation | Core analytics — **built** |
| **Must Have** | Live-NAV revaluation with plausibility gate + graceful fallback | Trust & correctness — **built** (AMFI edge fn pending) |
| **Must Have** | Data Check reconciliation + per-fund provenance | Trust surface — **built** |
| **Must Have** | Golden-fixture correctness gate in CI | Regression safety — **built** |
| **Should Have** | Nifty 50 benchmark comparison (disclosed proxy) | Differentiator — **built** |
| **Should Have** | Age-tailored educational commentary | Differentiator — **built** |
| **Should Have** | WCAG 2.1 AA accessibility pass | Public-product bar — **planned (workstream A)** |
| **Should Have** | Strict CSP, SRI, no-PII-egress automated test | Public-product bar — **planned (workstream S)** |
| **Should Have** | Cached AMFI edge function (primary NAV source) | Scale & reliability — **planned (tasks N2–N3)** |
| **Could Have** | Per-year hover tooltip on the value-vs-invested chart | Polish — **planned (task U2a)** |
| **Could Have** | IndexedDB same-day NAV cache | Perf/offline nicety — **planned (task N4)** |
| **Could Have** | Playwright end-to-end smoke + a11y checks | Confidence — **planned (task T1)** |
| **Could Have** | Installable PWA manifest (no offline SW) | Convenience — **optional** |
| **Won't Have (v1.0)** | User accounts / authentication / server-side persistence | Breaks the privacy model by design |
| **Won't Have (v1.0)** | CSV / equity / NSDL-CDSL demat ingestion | Premature generalization — deferred behind a documented seam |
| **Won't Have (v1.0)** | Multi-statement merge over time | Post-launch roadmap |
| **Won't Have (v1.0)** | Any third-party analytics or error tracking on data routes | Privacy guardrail (§8) |

### 3.3 Representative User Stories (with Acceptance Criteria)

**US-1 — Instant, private analysis**
> *As a privacy-conscious investor, I want to drop my CAS PDF and see my portfolio analysis without anything being uploaded, so that I can understand my holdings without surrendering my financial data.*
- **Given** a valid CAMS/KFintech CAS PDF, **when** I drop it on the upload bar, **then** the dashboard repaints with statement-only figures in under ~1.5 s and **no** network request contains the PDF, PAN, folios, or amounts.
- **Given** the same file, **when** parsing completes, **then** live NAVs and the benchmark load asynchronously and upgrade the figures without blocking the initial paint.

**US-2 — Money-weighted return**
> *As an investor who contributed on many dates, I want my true XIRR, so that I'm not misled by a naive value ÷ cost ratio.*
- **Given** a portfolio with multiple dated cash flows, **when** analysis runs, **then** the All-Time figure is the money-weighted XIRR over every dated flow to the valuation date.
- **Given** ≥ 12 months of history, **when** analysis runs, **then** a trailing 1-year XIRR is shown; **given** < 12 months, **then** the 1-year figure is blank (no fabricated window).

**US-3 — Benchmark honesty**
> *As an investor, I want to compare my return to a Nifty 50 index fund over my own holding period, so that I can judge whether my choices added value — without being shown a fabricated number.*
- **Given** a resolvable, currently-reporting Nifty 50 index fund, **when** the benchmark loads, **then** its CAGR over my all-time and 1-year spans appears beneath my XIRR figures, labelled as a fund proxy.
- **Given** no confident, non-stale match, **when** resolution fails, **then** the benchmark line is left blank and the Method Notes explain why.

**US-4 — Graceful degradation**
> *As a user on a flaky connection, I want the dashboard to still work, so that a network failure never blocks or corrupts my view.*
- **Given** a NAV endpoint fails, **when** the dashboard renders, **then** affected funds use statement NAV, the Data Check names them with a reason, and no cell shows NaN/blank.

**US-5 — Horizon-aware guidance**
> *As an investor, I want commentary tailored to my years-to-retirement, so that the guidance actually fits my stage of life.*
- **Given** an age of 30 and a target retirement age of 60, **when** commentary generates, **then** it reflects ~30 years to retirement; **given** age 55 / target 60, **then** the guidance is materially more conservative.
- **Given** a target retirement age ≤ current age, **when** validated, **then** a clear correction message is shown.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance & Scalability
- **First meaningful paint (statement-only, no network):** < 1.5 s on a mid-range laptop for a typical statement (tens of schemes, hundreds of transactions).
- **Full revaluation (live NAV + benchmark):** < 4 s on a typical connection; the live upgrade is always **non-blocking** (statement-only render first).
- **Compute:** the engine is pure and runs in milliseconds for realistic statements; a Web Worker is **deliberately deferred** until profiling shows real jank (statements are tiny; pdf.js already runs off the main thread).
- **Caching:** 180-second in-memory NAV cache today; an optional IndexedDB same-day cache and a shared **daily AMFI edge-function snapshot** (one fetch/day for all users, CDN-cached) are the planned scale strategy — far better than per-user, per-ISIN hits to hobby endpoints.
- **Scalability model:** the app is a **static SPA**; user concurrency scales with static hosting/CDN. The only shared backend (planned) is a stateless, cache-heavy NAV edge function.

### 4.2 Security & Compliance
- **Threat model is inverted vs a typical SaaS:** there is **no user account, no server-side session, and no database of user data**, so the classic auth/RBAC attack surface does not exist. This is a deliberate design decision, not an omission.
- **Data-egress boundary (the core control):** the only outbound requests are (a) public NAV lookups by **scheme name or ISIN**, (b) the Nifty 50 index-fund NAV history, and (c) static assets (fonts/pdf.js). The statement, PAN, folio numbers, holdings, and amounts **must never** be transmitted. This is to be **automatically verified** (planned test S3).
- **Local-only optional bridge:** the MarkItDown "Convert PDF to Markdown" path posts only to `127.0.0.1:8765` on the user's own machine; it is opt-in and never leaves the device.
- **In-transit:** all external calls over **TLS 1.3**; app served over HTTPS.
- **At-rest:** no server persistence in v1.0. Any future opt-in local snapshot must use **WebCrypto (AES-256-GCM), passphrase-derived key**, and default to **not** persisting.
- **Content-Security-Policy & SRI (planned S1):** strict CSP disallowing inline/eval beyond what's required; self-hosted pdf.js worker (no CDN script execution); SRI on any remaining CDN asset, or self-hosted fonts.
- **XSS hardening:** the ported string-builder chart/commentary/notes sinks use `dangerouslySetInnerHTML`; **all** statement-derived interpolation passes through `escapeHtml`, with per-sink assertions (audit tracked as S2; full JSX rewrite deferred as X5).
- **Compliance posture:** because no personal data is collected, transmitted, or stored server-side, **GDPR/DPDP-style data-controller obligations are minimised by architecture** rather than by policy. A visible in-app privacy statement (planned D2) will state exactly what leaves the device. The product is **not** a HIPAA/PCI system and handles no card/health data.

### 4.3 Accessibility (a11y) — target WCAG 2.1 AA (workstream A)
- Full **keyboard operability** for the donut slices, legend, sortable headers, chart gallery (prev/next/dots), accordion section buttons, commentary toggle/inputs, and the file drop zone; visible focus rings; correct ARIA roles, `aria-expanded`/`aria-controls`, `aria-pressed`/`aria-current`.
- **AA contrast** audit of the dark palette (especially muted text and tag/pill colours).
- **`prefers-reduced-motion`** honoured across gallery transitions and spinners.
- **Verification:** automated axe checks via the planned Playwright run, plus a manual keyboard-only walkthrough.

### 4.4 Reliability & Availability
- **Static-host availability target:** 99.9% (inherited from the CDN/static host).
- **NAV edge function (planned) target:** 99.9%, but the app is designed so **any** NAV failure degrades gracefully to statement NAV — availability of the analysis does **not** depend on NAV availability.
- **No data-loss risk by design:** nothing user-specific is stored server-side, so there is no backup/disaster-recovery obligation for user data. Source, fixtures, and docs are version-controlled.
- **Correctness reliability:** the golden-fixture suite (rupee-exact totals) plus the plausibility gate and benchmark-staleness check are the reliability backbone; CI blocks any drift.

---

## 5. Technical Architecture & Data Strategy

### 5.1 Tech Stack (as-built)

| Layer | Choice | Notes |
|---|---|---|
| **Language** | TypeScript ~6.0 (strict) | Financial math + a messy parser both depend on the type system. |
| **Framework** | React 19 + Vite 8 | Component model; Vite dev server & build. |
| **PDF extraction** | pdfjs-dist ^6.1 (in-browser) | Lazy-loaded; needs browser APIs (`DOMMatrix`). |
| **Alt. extraction** | MarkItDown via local bridge (`markitdown_server.py`) | Opt-in, localhost-only; cleaner table reconstruction. |
| **Engine / parser** | Pure TS modules, **zero deps, no DOM/fetch** | Publishable/reusable in isolation. |
| **Market data** | mf.captnemo.in (ISIN) + mfapi.in (name), CORS-native; AMFI edge fn (planned primary) | Prices only; plausibility-gated. |
| **Charts** | Hand-rolled inline SVG | Dependency-free, print-clean, on-brand. |
| **Styling** | CSS custom properties + design tokens (`ui/tokens.css`, `ui/deck.css`) | Dark theme app-wide; one font. |
| **Testing** | Vitest 4 (157 unit + golden-fixture tests); Playwright planned (T1) | Network fully fetch-mocked. |
| **Tooling** | oxlint, Prettier, `tsc -b --noEmit`; CI = one app job | Fast lint; project-reference typecheck. |
| **Prod dependencies** | **Only 3**: `react`, `react-dom`, `pdfjs-dist` | Deliberately minimal attack/bloat surface. |
| **Deploy (planned)** | Static SPA on Cloudflare/Vercel/Netlify + one stateless NAV edge function | See tasks D1. |

### 5.2 System Architecture

**Client-first, (nearly) backend-less.** The interaction model is not a request/response API to an application server; it is a **local pipeline** with a single, narrow, price-only network egress:

```
 input text ──► normalizeInput ──► parseStatement ──► analyzePortfolio ──► PF (portfolio object)
   ▲                                                        │  (+ live NAV map via resolveLiveNavs
   │                                                        │   + Nifty 50 benchmark via fetchNiftyBenchmark)
 PDF (pdf.js) / .md file / MarkItDown bridge                ▼
   (src/ingest/)                                         <App/> ──► Command Deck + Portfolio Analysis sections
                                                             │
                                                   runDataCheck / Commentary
```

- **Pure core** (`engine/`, `parsing/`, `reference/`) has no React, DOM, or `fetch` — it could ship as an npm package or run in a CLI.
- **Network layer** (`marketdata/`) is the *only* egress and returns prices keyed by ISIN/name.
- **UI layer** (`features/`, `charts/`, `ui/`, `App.tsx`) is a thin, stateful shell over the pure core.
- **API paradigm:** the external NAV sources are consumed as simple **REST/JSON over HTTPS**; there is no GraphQL and no first-party application API in v1.0. The planned AMFI edge function is a single stateless REST endpoint returning an ISIN→{nav,date,name} map with permissive CORS.

### 5.3 Data Model & Schema (in-memory domain model)

There is **no database**; these are the in-memory TypeScript entities produced by the pipeline and consumed by the UI.

| Entity | Key Fields (types) | Relationships |
|---|---|---|
| **Statement (text)** | raw normalized text | 1 → many `Scheme` |
| **Scheme** | `house` (str), `name` (str), `isin` (str), `folio` (str), `nav` (num), `navDate` (Date), `marketValue` (num), `closingUnits` (num), `costValue` (num) | 1 → many `Txn` |
| **Txn** | `date` (Date), `units` (num; +buy / −sell), `amount` (num), `price` (num), `stamp` (num) | many → 1 `Scheme` |
| **Fund** (`analyzeScheme` result) | `marketValue`, `unrealised`, per-lot `stcg`/`ltcg`, `realised`, `cagr`, `navLive`, `navSource`, `liveName`, `active` (bool), `hasCostBasis` (bool), `allocAmt`, `meta` | derived 1:1 from `Scheme` |
| **FundMeta** (`reference/fundMeta.ts`) | keyed by ISIN: `category`, `alloc:{equity,debt,cash,other}`, `geo?`, `benchmark`, `expense`, `launch`, `exit`, `amc`, `note` | many `Scheme` → 1 `FundMeta` (by ISIN) |
| **BenchmarkPoint** | `date` (Date), `nav` (num) | series for the Nifty 50 proxy fund |
| **PF / Portfolio** (top-level result) | `funds[]`, `totalValue`, `totalCost`, `unrealised`, `realised`, `xirr`, `portXirr1Y`, `allTimeReturn`, `portCagr`, `inceptionDate`, `inceptionYears`, `alloc:{equity,debt,cash,other}`, `geo:[{country,pct}]`, `houses:[{house,cost,value,hasCost}]`, `series:{line,annual,rolling,drawdown,contrib,…}`, `live`, `liveMatched`, `liveAsOf`, `liveSource`, `valDate` | aggregates all `Fund`s |

> Note: the `series` object still computes a `drawdown` TWR index internally; the **Drawdown chart** was removed from the gallery (Revision 4), but the series field is retained for correctness of other views and potential reuse.

### 5.4 Reference & Provenance Data
- `reference/fundMeta.ts` — hand-curated, ISIN-keyed metadata for funds encountered; **intentionally not expanded into a large database** (unknown funds fall back to keyword inference).
- `reference/aliases.ts` — known scheme renames for harmonisation.
- `reference/geo.ts` — country-exposure **estimates** (the CAS discloses no country split).

---

## 6. UI/UX & Design System Guidelines

### 6.1 Design Principles
- **Quick-glance first, depth on demand.** The default view (the "Command Deck") answers "how am I doing?" at a glance; everything deeper opens from a permanent **Portfolio Analysis** accordion.
- **Responsive, desktop-optimised.** A 2-column deck at ≥ 1024 px collapses to a single column below; no horizontal scroll at any width.
- **Trust through traceability.** Every number is attributable; the Data Check headline is always visible; caveats are disclosed, not hidden.
- **Craft rules:** one font family; `font-variant-numeric: tabular-nums` on all figures; Title Case on every label/header/button; a single positive-delta accent colour; all controls white-on-dark.

### 6.2 Information Architecture

```
Portfolio Dashboard (single page)
├─ Upload Bar (PDF / .md / paste / Convert PDF to Markdown)
├─ Data Check headline  ──►(link)──►  Data Sources section
├─ Command Deck
│  ├─ Masthead — "«First name»'s Portfolio Summary" · As of «date» · Live NAV · Refresh
│  ├─ KPI Rail (4 tiles)
│  │  ├─ Total Value / Total Invested
│  │  ├─ Total Gain / ST-LT Split
│  │  ├─ XIRR (All-Time) & (1Y)  — each with Nifty 50 figure beneath
│  │  └─ Insight  ──►(link)──►  Full Commentary
│  └─ 2-column grid
│     ├─ Left: Value-vs-Invested chart  +  Top-5 Holdings table
│     └─ Right: Allocation donut + legend (height-matched to the left column)
├─ Portfolio Commentary (collapsible; age + target retirement age inputs)
└─ Portfolio Analysis (accordion; "View All" opens all six)
   ├─ 6-Chart Gallery   ├─ Full Holdings   ├─ Fund Houses
   ├─ Fund Cards        ├─ Data Sources    └─ Method Notes
Footer — "Not investment advice." · As of «date»
```

### 6.3 Key Screen Specifications & State Behaviour

| Region | Layout / Component Expectation | States |
|---|---|---|
| **Upload Bar** | Drop zone + browse + "Convert PDF to Markdown" + "Load Sample Statement". | *Idle* prompt; *Reading…* / *Converting…*; *Error* (wrong file type, bridge unreachable) with actionable text. |
| **Data Check** | One-line pass/fail headline; link to Data Sources. | *Pass* ("all N holdings valued on live NAVs as of «date»"); *Partial* ("M of N passed…"); renders nothing until a live-NAV attempt has occurred. |
| **KPI Rail** | 4 equal tiles; XIRR tile shows All-Time & 1Y in the label colour, Nifty 50 comparison in white beneath each. | *Live* figures with tag; *statement-only* pre-live; benchmark line *blank* when unresolved. |
| **Value-vs-Invested chart** | Labelled ₹ (lakh/crore) Y-axis + year X-axis; solid value line + dashed invested line + legend. | Per-year hover tooltip is **planned** (U2a). |
| **Allocation donut** | 240 px donut + legend; centre shows Total Value; slices drill down to contributing funds. | *No selection* prompt; *selected* slice lists funds; keyboard-selectable (a11y target). |
| **Portfolio Analysis** | Six section buttons; selecting one closes the previously open one (accordion); open button flips to white-bg/black-text; **View All** opens all six. | *Collapsed* default; *one open*; *all open*. |
| **Empty / first load** | A bundled sample is loaded so the deck is never blank. | *Sample* on first paint; replaced on user upload. |
| **Global error** | Parse failure → "No schemes found. Is it a CAMS / KFintech consolidated statement?" | Non-destructive; the previous view is retained where possible. |

### 6.4 Design Tokens (dark theme, app-wide)

```
deck bg #14161b · card/tile bg #1c1f26 · frame border #20242c · card border #2a2f39
text primary #f2f4f7 · secondary #9aa0ab · muted #7c828d · table cell #e8eaed
positive #3ecf8e · link #8fbef2 · button text #ffffff
allocation: equity #3987e5 · debt #22b783 · cash #e0a12a · other #9085e9
chart: value line #3987e5 (area @13%) · invested line #7c828d (dashed) · gridline #242832
type scale: 16px title · 12px labels · 21px KPI value · 9–11px chart/axis; tabular-nums on all figures
radii: 12px card · 8px control
```

---

## 7. Release Plan, Milestones & Risk Management

### 7.1 Phased Implementation Timeline

| Phase | Scope | Status |
|---|---|---|
| **Phase 1 — Foundation** | Vite/React/TS scaffold, tokens, golden-fixture CI harness | ✅ Complete |
| **Phase 2 — Ingestion & Parser** | pdf.js + MarkItDown + paste routes; CAMS/KFintech parser; parity + golden tests | ✅ Complete |
| **Phase 3 — Engine** | XIRR (all-time + 1Y), CAGR, Modified-Dietz, STCG/LTCG, allocation, series | ✅ Complete |
| **Phase 4 — Core UI (Command Deck)** | Masthead, KPI rail, 2-column deck, 6-chart gallery, sortable tables, allocation drill-down | ✅ Complete (chart hover tooltip U2a pending) |
| **Phase 5 — Commentary & Benchmark** | Age/retirement-age commentary; Nifty 50 index-fund-proxy comparison | ✅ Complete |
| **Phase 6 — Data Check & Hardening** | Reconciliation panel; provenance; exited-folio handling | ✅ Complete |
| **Phase 7 — Market-data reliability** | Cached AMFI edge function (primary) + rewire resolve (fallback) | 🔄 In progress (tasks N2–N3) |
| **Phase 8 — Public-product bar** | Accessibility (A), Security/CSP/egress test (S), Playwright e2e (T) | ⬜ Planned |
| **Phase 9 — Deploy & Launch** | Static SPA + edge-fn deploy config; in-app privacy note | ⬜ Planned (D1–D2) |
| **Phase 10 — Post-launch roadmap** | Multi-statement merge; demat (NSDL/CDSL); export; optional encrypted local save | ⬜ Deferred |

### 7.2 Risk Assessment Matrix

| # | Risk | Prob. | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **NAV endpoint failure or drift** (hobby endpoints change/rate-limit; AMFI has no CORS). | Med | High | Multi-source with plausibility gate + graceful statement-NAV fallback; move primary to a **cached AMFI edge function** (N2–N3) to reduce dependence on per-ISIN hobby hits. |
| R2 | **Silently stale/wrong benchmark or NAV** (a wound-up scheme keeps its last value; a wrong-fund name match). | Med | High | Benchmark **staleness recency check** + longest-history preference; NAV **⅓×–3× plausibility gate**; blank-rather-than-guess; live browser verification, not just green tests. |
| R3 | **Parser breakage on an unseen CAS layout** (new CAMS/KFintech variant). | Med | Med | Position-independent, pattern-based parsing; source-agnostic normaliser; **golden-fixture CI** across real CAMS + KFintech statements; add fixtures as new layouts appear. |
| R4 | **Privacy regression** (an added feature accidentally transmits statement data or adds an analytics beacon). | Low | Critical | Hard architectural boundary (only `marketdata/` egresses, prices only); planned **automated no-PII-egress test (S3)**; strict CSP (S1); explicit guardrails (§8). |
| R5 | **XSS via crafted fund name** into an HTML-string chart/commentary sink. | Low | High | All statement-derived interpolation routed through `escapeHtml`; per-sink assertions (S2); eventual JSX rewrite (X5). |
| R6 | **Correctness regression** (a refactor moves a golden total or breaks the plausibility gate). | Low | High | Rupee-exact golden fixtures + decoy regression tests block merges; documented invariants in `docs/DECISIONS.md`. |

---

## 8. Guardrails — What This Product Must NOT Do

These are **hard constraints**. A change that violates any of them is a defect, regardless of feature value.

**Privacy & data handling**
1. **Never transmit the statement, the PDF, PAN, folio numbers, holdings, or amounts off the device.** Outbound requests may carry **only** a scheme name or ISIN for a public NAV lookup.
2. **Never add third-party analytics, ad, session-replay, or error-tracking scripts** to any route that has touched statement data. Zero beacons.
3. **Never persist user financial data server-side.** No accounts, no cloud sync, no server DB in v1.0. Any future local persistence must be opt-in, encrypted (WebCrypto/AES-256-GCM), and off by default.
4. **Never route statement data through a public CORS proxy.** (These were deliberately removed as a production liability; do not reintroduce them.)

**Correctness & honesty**
5. **Never present a guessed, stale, or implausible figure as if it were current or real.** If a NAV fails the plausibility gate or a benchmark fund is stale/unmatched, fall back with a stated reason or leave it **blank** — do not fabricate.
6. **Never break the golden-fixture rupee-exact totals** or the wrong-fund-decoy rejection without an explicit, reviewed decision.
7. **Never claim to bundle or "attach" copyrighted material** (e.g., books). Reference by citation only; use only publicly/freely available factual data.

**Scope & architecture discipline**
8. **Never re-introduce a second implementation of the engine.** `app/` is the single source of truth; no HTML prototype, no mirror.
9. **Do not build speculative generality now** — no CSV/equity/demat ingestion, no multi-market abstraction, no Web Worker, no offline service worker — until there is a concrete, decided need. Keep only the *documented seam*.
10. **Do not expand `FUND_META` into a large maintained database.** It is a core-view input, not a data product; unknown funds fall back to inference.

**Advice boundary & UX**
11. **Never present the commentary as personalised financial advice.** Keep the educational framing and the SEBI-RIA disclaimer; never recommend buying/selling a specific security.
12. **Never block the initial render on the network.** Statement-only analysis paints first; live NAV and benchmark upgrade asynchronously.
13. **No dark patterns** — no forced sign-up, no retention hooks, no monetisation of financial data.

---

## 9. Glossary

| Term | Meaning |
|---|---|
| **CAS** | Consolidated Account Statement (CAMS + KFintech mutual-fund holdings for an email/PAN). |
| **CAMS / KFintech** | The two registrar-transfer agents whose statement layouts the parser supports. |
| **NAV** | Net Asset Value — a fund's per-unit price. |
| **AMFI `NAVAll.txt`** | Official daily NAV file (no CORS → needs a proxy/snapshot/edge function). |
| **XIRR** | Money-weighted return over dated cash flows (the true "since inception" return). |
| **CAGR** | Compound annual growth rate. |
| **Modified Dietz** | Period return that accounts for the timing of cash flows. |
| **TWR** | Time-weighted return (contributions removed); used internally for the drawdown index. |
| **STCG / LTCG** | Short-/Long-Term Capital Gains (threshold: 12 months equity, 24 months debt). |
| **Plausibility gate** | Rejects a live NAV outside ⅓×–3× of the statement NAV (a wrong-fund match). |
| **Glide path** | Planned de-risking (equity → bonds) as retirement approaches. |
| **Look-through allocation** | Equity/Debt/Cash/Other split derived from each fund's underlying mix. |
| **MarkItDown** | Microsoft's PDF→Markdown converter; an optional, local, cleaner extraction route. |

---

*This document describes the product as built as of 2026-07-04 (v1.0.0), together with its committed quality bar and near-term roadmap. For live task status see `tasks.md`; for the original blueprint and architectural rationale see `plan.md` and `docs/`.*
