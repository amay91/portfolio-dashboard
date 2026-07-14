# Portfolio Dashboard — Indian Mutual Funds (from CAMS/KFintech CAS)

A **privacy‑first browser dashboard** that turns a CAMS/KFintech Consolidated Account Statement (CAS) into a full portfolio analysis — XIRR/CAGR, capital gains, live‑NAV valuation, asset & country allocation, a 6‑chart gallery, an automatic data‑check, and age‑tailored (Bogle/Boglehead) commentary. Parsing and computation run client‑side; the statement never leaves your device.

> **New here / picking this up? Read [`handoff.md`](./handoff.md) first.**

## Quick start
```bash
cd app
npm install
npm run dev            # Vite dev server; loads a sample, tries live NAVs, drop your own CAS

# recommended extraction: MarkItDown (cleaner than raw PDF text)
pip install "markitdown[pdf]"
python markitdown_server.py            # localhost bridge for the "Convert PDF to Markdown" button

# test after any change
cd app && npm run typecheck && npm run lint && npm test
```

## Docs
- [`product_spec.md`](./product_spec.md) — **as-built product specification (PRD)**: what the product is and does today, plus its quality bar.
- [`handoff.md`](./handoff.md) — full context to continue the project.
- [`plan.md`](./plan.md) — build blueprint + locked review decisions (§0).
- [`tasks.md`](./tasks.md) — numbered task list + progress checklist (**status source of truth**).
- [`name_overrides.md`](./name_overrides.md) — every name-harmonisation rule (fund houses, scheme names) in one place; update it whenever a naming rule changes.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — module/function map + data model.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — why it's built this way; **invariants not to break**.
- [`docs/TESTING.md`](./docs/TESTING.md) — Vitest + golden‑fixture harness.

## Layout
```
app/                Vite + React 19 + TS — the app. Fixtures live in app/tests/fixtures/.
                    See app/src layout in docs/ARCHITECTURE.md.
markitdown_server.py    localhost MarkItDown bridge
docs/                   ARCHITECTURE / DECISIONS / TESTING / DEPLOY
docs/manual-testing/    10 randomized CAS fixtures for manual browser-driven exploratory
                        testing (not wired into the automated suite — see its README)
plan.md  tasks.md  handoff.md
```

## Status
`app/` is the sole implementation, validated against six real statements (exact totals). Not
investment advice. A consolidation/hardening pass is in progress — see [`tasks.md`](./tasks.md)
for what's landed and what's next, and `handoff.md §4` for known caveats (notably: NAV depends
on public endpoints; the value/return time series is reconstructed from transaction prices;
geography is a factsheet‑level estimate).
