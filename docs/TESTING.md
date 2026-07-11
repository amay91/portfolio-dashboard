# Testing

`app/` is verified with **Vitest**: unit specs per module plus a **golden‑fixture** layer
(real statements → known exact totals). There is one implementation and one test suite —
no separate prototype harness to keep in sync (see `docs/DECISIONS.md` "Retiring the
HTML/mirror duplication").

## Run it

```bash
cd app
npm install
npm run typecheck && npm run lint && npm test
```

`npm run typecheck` runs `tsc -b --noEmit` (project‑reference build mode) — **use this, not a
bare `tsc --noEmit`**, which has missed a real type re‑export gap before. `npm run lint` runs
`oxlint`, not eslint.

## What the suite covers

**Golden fixtures** (`app/src/parsing/cas/fixtures.spec.ts`, `app/src/engine/portfolio.spec.ts`):
each fixture in `app/tests/fixtures/` parses/analyzes to its known **statement‑only total**
(to the rupee — see the table in `handoff.md §2`), MarkItDown‑Markdown and pdf.js‑text of the
same statement agree, and geography sums to 100%.

**Unit specs per module** — `engine/{xirr,cagr,gains,harmonise,scheme,portfolio,datacheck,series}.spec.ts`,
`marketdata/{cache,resolve,liveIntegration}.spec.ts` + `marketdata/sources/*.spec.ts`,
`charts/{scales,gallery.integration}.spec.ts`, `features/**/*.spec.ts`, `format.spec.ts`,
`ingest/router.spec.ts`. Network calls are **fetch‑mocked** throughout — no real network in
the suite (live‑NAV matching still needs a manual browser check, see below).

**Regression locks worth knowing about** (see `docs/DECISIONS.md` for the incidents):
the plausibility gate rejecting a wrong‑fund decoy (`marketdata/liveIntegration.spec.ts`,
`engine/scheme.spec.ts`), the KFintech split‑ISIN fix (`fixtures.spec.ts`), the `liveSource`
single‑mention‑per‑source fix (`marketdata/resolve.spec.ts`), and the doubled‑₹ caption fix
(`charts/gallery.integration.spec.ts`, `features/commentary/commentaryText.spec.ts`).

**Known gap:** there is currently no full‑app‑mount render smoke test (the retired prototype's
`test.mjs` had one — boot the whole page, assert the summary table/charts/sortable
headers/data‑check/commentary all render). Component logic is covered individually; an
end‑to‑end mount check is tracked in `tasks.md` (workstream T — Playwright e2e covers this
more robustly than a jsdom mount would).

## Fixtures (`app/tests/fixtures/`)

| File | What | Expected total |
|---|---|---|
| `sample.txt` | 8‑scheme sample (default demo) | ₹43,10,702 |
| `alok_2025.txt` | Alok, 13 schemes, older date | ₹2,31,44,598 |
| `axis.txt` | AXIS, 3 schemes, no ISINs, "Valuation on" | ₹81,505 |
| `alok_2026.txt` | Alok, 30‑Jun‑2026, primary case | ₹2,51,65,629 |
| `markitdown_cas.md` | MarkItDown output of `alok_2026` | ₹2,51,65,629 |
| `vandana_kfintech.txt` | Vandana, 03‑Jul‑2026, 29 schemes, first confirmed KFintech‑registrar fixture (AXIS/Quant/Quantum/UTI) | ₹3,42,02,380 |

To add a fixture: drop the extracted text (or MarkItDown `.md`) into `app/tests/fixtures/`, add
it to `FIXTURES` in `app/tests/fixtures/expected.ts` with its hand‑verified total.

### Generating fixtures from a PDF
- **MarkItDown:** `markitdown statement.pdf -o app/tests/fixtures/name.md`
- **pdf.js:** drop the PDF into the running app — `app/src/ingest/pdf.ts` extracts it the same
  way the browser does. Any faithful text extraction works, because `normalizeInput` + the
  position‑independent parser tolerate both.

## Manual checks the suite can't fully cover

- **Live NAV matching** — needs the network. Sanity‑check that held funds show a green "live"
  tag and the total is close to the statement total; the **Data Check** panel names anything on
  statement NAV and why.
- **Display strings** — a green suite checks numbers, not what's rendered on screen. The
  `liveSource` and doubled‑₹ bugs (`docs/DECISIONS.md`) were both real, both had correct
  underlying numbers, and were only caught by loading the page. **Verify UI‑affecting changes
  live in a browser, every time.**
- **Sorting / carousel / commentary inputs** — covered by component‑level specs; a full
  click‑through is exercised by the Playwright e2e smoke (`tasks.md` task T1) once it exists.

## Fund-matching reliability tools (`app/tools/`, `app/e2e-network/`)

Built for a specific, recurring worry: *"a new statement uploads a fund that doesn't get
recognized."* These make **real network calls** and are deliberately excluded from the automated
gate above (`tools/*.spec.ts` self-skip without an opt-in env var; `e2e-network/` has its own
Playwright config, never invoked by `npm run test:e2e` or CI) — run them by hand, periodically,
or whenever a rename/matching bug is suspected.

- **`tools/matchAudit.spec.ts`** — paste any CAS statement in, get a per-fund report of which
  tier (AMFI by ISIN, mf.captnemo.in, AMFI by name, or the mfapi.in name-search rescue)
  resolved a live NAV for it, or why it missed.
  ```bash
  MATCH_AUDIT_FILE=tests/fixtures/coverage_sample_no_isin.txt npx vitest run tools/matchAudit.spec.ts --reporter=verbose
  ```
- **`tools/renameScan.spec.ts`** — proactive companion to `src/reference/aliases.ts` (which is
  otherwise purely reactive — an alias only gets added after a real statement's old name fails
  to match). Scans AMFI's live scheme list for its own "(erstwhile ‹old name›)" rename markers
  and reports which ones `aliases.ts` doesn't yet cover. Flags candidates whose erstwhile
  fragment shares no token with the current name (AMFI's annotation can omit the AMC prefix,
  e.g. just "Cash Option") as needing manual review before adding — `canonCore` doesn't strip
  AMC names, so pasting an unqualified fragment in verbatim would create an unsafe, overly broad
  global alias.
  ```bash
  RUN_NETWORK_TOOLS=1 npx vitest run tools/renameScan.spec.ts --reporter=verbose
  ```
- **`tools/fuzzUniverse.spec.ts`** — a self-consistency fuzz test against AMFI's entire live
  universe (~14,000 schemes), not just a curated sample: for every row, does `liveKey()`/
  `fuzzyLive()` (the exact functions `resolve.ts` uses) find that row when looked up by its own
  name? A miss here is a bug in the matching logic itself, not a data gap.
  ```bash
  RUN_NETWORK_TOOLS=1 npx vitest run tools/fuzzUniverse.spec.ts --reporter=verbose
  ```
- **`e2e-network/networkSmoke.spec.ts`** — the one test in this repo that loads the Sample
  Portfolio in a real browser against the real internet (no route mocking), since CORS/
  connection-pooling failures have repeatedly only shown up live, never in Node/jsdom (see
  `docs/DECISIONS.md`). Catches a total upstream outage; leaves per-fund precision to the tools
  above.
  ```bash
  npm run test:network-smoke
  ```

## CI

`.github/workflows/ci.yml` runs `cd app && npm run typecheck && npm run lint && npm test` on
push/PR. (Historically this repo also ran a root‑level prototype harness — that job is gone
along with the prototype it tested.)
