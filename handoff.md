# Handoff — Indian Mutual‑Fund Portfolio Dashboard

**Purpose of this doc:** everything you need to continue this project in a fresh session without re‑discovering context. Read this first, then `docs/ARCHITECTURE.md` (how the code is organised), `docs/DECISIONS.md` (why it is the way it is — the bugs and the fixes, so you don't regress them), `docs/TESTING.md` (how to verify changes), `plan.md` (the blueprint + locked review decisions), and `tasks.md` (**the current source of truth for status and next steps** — don't look for a status narrative here, it lives there).

---

## 1. What this is

A **privacy‑first, browser‑based dashboard** that ingests an Indian **CAMS/KFintech Consolidated Account Statement (CAS)** and turns it into a portfolio analysis. Parsing and computation run client‑side — the statement never leaves the device; the network is used only to fetch **public NAV prices** (scheme name/ISIN only, never PAN/folio/amounts).

**`app/` is the sole implementation** (Vite + React 19 + TypeScript). There is no other copy of the engine — the original single-file HTML prototype and its `reference/engine.js` mirror were retired once `app/` reached verified parity (2026‑07‑03); see `docs/DECISIONS.md` for why that duplication existed and what it cost.

### What it does
- Parses the CAS (schemes, folios, ISINs, every transaction, NAV/market‑value/cost/units) — tolerant of both CAMS and KFintech‑registrar layouts.
- Computes **per‑fund + portfolio XIRR**, weighted **CAGR**, **Modified‑Dietz** calendar‑year and rolling returns, per‑lot **STCG/LTCG** capital gains, realised gains, since‑inception money‑weighted return.
- **Live‑NAV valuation**: revalues to the latest published NAV, with fund‑matching and a plausibility gate that rejects wrong‑fund matches (see `docs/DECISIONS.md`).
- **Look‑through allocation** (equity/debt/cash/other) donut + **geographical concentration** chart, a **6‑chart gallery**, sortable holdings/AMC tables, a **Data Check** panel, and a collapsible age‑tailored **Portfolio Commentary** (Bogle/Boglehead‑grounded).
- **Three input routes** to the same parser: drop a **PDF** (pdf.js, in‑browser), drop a **MarkItDown `.md`** file, or **"Convert PDF to Markdown"** via a local MarkItDown bridge.
- Exited/zero‑balance folios are hidden from views but retained in realised gains and since‑inception return.

Design language: dual dark/light theme ("Terminal Deck" / "The Ledger", instant-toggle, 2026‑07‑08) — JetBrains Mono throughout in dark, Fraunces + Courier Prime in light — Indian lakh/crore INR formatting, en‑GB dates. Point-of-use ⓘ explainers, actionable "Worth a Look" insight flags, and a retirement corpus projection turn the raw numbers into guidance rather than just a mirror of the statement.

**Two critical reviews have shaped this app**: the 2026‑07‑03 review (source of truth = `app/`, lean-core "Command Deck" UI, NAV-layer simplification — fully landed) and a 2026‑07‑12 comprehensive review against the "empower, not just display" objective, whose recommendations menu (Themes A–E, tracked as `tasks.md`'s `R` items) is largely landed as of this writing. `tasks.md`'s progress checklist is authoritative for what's actually done at any point in time — don't infer current shape from this file's feature list alone.

---

## 2. Repo contents

```
app/                    ← THE APP. Vite + React 19 + TS. See app/src layout in docs/ARCHITECTURE.md.
                          `cd app && npm run dev` (local) / `npm test` / `npm run typecheck` (tsc -b —
                          use this, not a bare `tsc --noEmit`, which misses type re-export gaps) /
                          `npm run lint` (oxlint, not eslint).
server/                 ← Local dev-only feedback-form relay (plain Node, CommonJS); production
                          uses a Cloudflare Pages Function instead (app/functions/api/feedback.ts).
feedback-rules.json     ← Category list + message-length cap, shared by both feedback backends.
plan.md                 ← Blueprint + §0 locked review decisions (current architecture direction).
tasks.md                ← Numbered task list + progress checklist. THE status source of truth.
markitdown_server.py    ← Tiny localhost bridge for "Convert PDF to Markdown" (app/'s UploadBar
                          calls it at 127.0.0.1:8765; browsers can't run Python MarkItDown directly).
docs/ARCHITECTURE.md    ← Module/function map + data model + pipeline.
docs/DECISIONS.md       ← Chronological decision & bug-fix log (READ THIS before touching the
                          engine or NAV-matching — the "Invariant" lines are regressions if moved).
docs/TESTING.md         ← How to test (Vitest golden fixtures, all inside app/tests/fixtures/).
docs/DEPLOY.md          ← Cloudflare Pages deploy steps.
docs/manual-testing/    ← 10 randomized CAS fixtures for manual browser-driven exploratory
                          testing (not wired into the automated suite — see its own README).
.github/workflows/ci.yml  ← Two jobs: app/ typecheck+lint+unit-test, and Playwright e2e.
.gitignore
```

**Expected totals (statement‑only market value)** — golden numbers; any change that moves them is a regression:

| Fixture | Total market value |
|---|---|
| `sample.txt` | ₹43,10,702 |
| `alok_2025.txt` | ₹2,31,44,598 |
| `axis.txt` | ₹81,505 |
| `alok_2026.txt` | ₹2,51,65,629 |
| `markitdown_cas.md` | ₹2,51,65,629 (must equal `alok_2026.txt`) |
| `vandana_kfintech.txt` | ₹3,42,02,380 |

---

## 3. How to run & continue

### Run it
```bash
cd app
npm install
npm run dev            # Vite dev server; loads the sample and tries live NAVs
```
Drop your own CAS PDF, or a MarkItDown `.md`, in the upload bar.

### MarkItDown pipeline (recommended extraction)
MarkItDown reconstructs the CAS tables more cleanly than raw PDF text. A browser page can't run Python MarkItDown, so there's a **tiny local bridge**:
```bash
pip install "markitdown[pdf]"
python markitdown_server.py          # serves 127.0.0.1:8765, no storage, localhost only
```
Then in the dashboard, select/drop the PDF and click **"Convert PDF to Markdown"**. Alternatively run `markitdown statement.pdf -o statement.md` and drop the `.md`. In **Claude Desktop** you can instead ask Claude to run the PDF through the `markitdown` MCP tool and drop/paste the Markdown it returns.

### Test after every change
```bash
cd app
npm run typecheck && npm run lint && npm test
```
See `docs/TESTING.md` for what the suite covers. **Run this before and after any change**, and verify UI-affecting changes live in a browser (a green test suite catches wrong numbers, not wrong display strings — see the `docs/DECISIONS.md` entries on the `liveSource` and doubled‑₹ bugs, both caught only by looking at the rendered page).

---

## 4. Status, caveats, and what's next

**Don't look here for a status narrative — it doesn't live in this file.** Two documents own it:
- **`plan.md` §0** — the locked architecture decisions from the 2026‑07‑03 review (source of truth = `app/`; NAV layer simplification; lean‑core UI; what's deferred and why).
- **`tasks.md`** — the numbered task list with a progress checklist at the top. This is updated as work lands and is the accurate "what's done / what's next" at any point in time.

### Known limitations / caveats (be honest about these in the UI)
- **No historical NAVs**: the value/return time series is reconstructed from your own transaction prices (interpolated between points) and today's NAV — exact at endpoints and transaction dates, a smooth estimate between them.
- **Geography is a factsheet‑level estimate** — the CAS doesn't disclose country splits.
- **NAV fetch depends on external endpoints**; the Data Check panel says which funds fell back to statement NAV and why.
- **Commentary is educational**, not personalised advice (SEBI‑RIA boundary) — keep the disclaimer.
- **`FUND_META` coverage** is limited to funds encountered; unknown funds fall back to keyword inference.

---

## 5. Prompt to kick off a new session

> I'm continuing this project. Read `handoff.md`, then `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/TESTING.md`, `plan.md` (especially §0), and `tasks.md`. `app/` is the sole implementation — `cd app && npm test && npm run typecheck && npm run lint` to verify. Before touching the engine or NAV-matching, read the invariants in `docs/DECISIONS.md` so we don't regress them. Today I want to: **<your task>** — e.g. "implement tasks.md task N1," or "continue with workstream U," or "add more CAMS/KFintech fixtures."

---

## 6. Quick glossary
- **CAS** — Consolidated Account Statement (CAMS + KFintech mutual‑fund holdings for an email/PAN).
- **AMFI `NAVAll.txt`** — official daily NAV file (no CORS → needs a proxy/snapshot/edge function).
- **XIRR** — money‑weighted return over dated cash flows. **Modified Dietz** — period return accounting for flow timing. **TWR** — time‑weighted return (contributions removed), used for drawdown.
- **Plausibility gate** — reject a live NAV that differs implausibly from the statement NAV (a wrong‑fund match).
- **Glide path** — planned de‑risking (equity→bonds) as retirement approaches; the commentary explains it.
