# Test portfolios

10 randomized CAS-format statements for exercising the dashboard end-to-end without needing a
real statement. Each is a complete, self-contained CAS-style text file — house, scheme name +
ISIN, folio number, dated purchase transaction(s), a statement NAV/date, and a closing unit
balance per fund — the same shape `parseStatement` expects from a real upload. Nothing else is
needed to load one: no external lookup files, no generation script.

Generated 2026-07-11 from the 100-fund coverage universe (`docs/DECISIONS.md` "100-fund coverage
sweep") via a seeded PRNG: 10 funds per portfolio, random purchase dates (~1.1–5.75 years back),
random purchase amounts/prices, and about half the funds get a second smaller top-up purchase at a
later date. **Each portfolio has exactly one holding sized to be worth >₹1 crore at today's NAV**
(the "big fund" below), specifically to exercise the "one dominant holding" layout edge cases
(this is what caught a real chart-scaling bug — see the DECISIONS.md entry above).

| File | Big fund (>₹1cr holding) |
|---|---|
| `portfolio_1.txt` | ICICI Prudential Liquid Fund |
| `portfolio_2.txt` | Motilal Oswal Nasdaq 100 Fund of Fund |
| `portfolio_3.txt` | Quantum Nifty 50 ETF FOF |
| `portfolio_4.txt` | HDFC Overnight Fund |
| `portfolio_5.txt` | Bharat Bond FOF - April 2030 |
| `portfolio_6.txt` | Axis Gold Fund |
| `portfolio_7.txt` | HDFC NIFTY Next 50 Index Fund |
| `portfolio_8.txt` | SBI Small Cap Fund |
| `portfolio_9.txt` | Aditya Birla Sun Life Liquid Fund |
| `portfolio_10.txt` | ICICI Prudential Money Market Fund |

All 10 were verified against the live app on 2026-07-11: Data Check passed, XIRR populated and
sane, Full Holdings sums reconciled to the KPI total, and every chart in the 6-chart gallery
rendered within bounds (no clipped/missing labels).

## Loading one of these into the dashboard

The dashboard's upload bar only accepts a real file (drag-drop or click-to-browse) or a
MarkItDown `.md` paste — there's no built-in "load from disk path" affordance, so driving it from
here needs one of:

- **Real file upload**, if the browser tool in use supports it (e.g. `file_upload` in the
  claude-in-chrome toolset) — attach one of these `.txt` files to `UploadBar`'s file input.
- **A temporary test hook**, the technique used to generate/verify these files in the first place:
  a short-lived `useEffect` in `app/src/App.tsx` exposing `window.__loadTestPortfolio(path)` that
  `fetch()`es a statement and calls the same `updateDashboard()` a real upload does — copy the
  target file into `app/public/` temporarily, add the hook, drive it via `javascript_tool`, then
  remove both when done (don't leave this wired into the shipped app).

Either path exercises the real ingest → parse → live-NAV → analyze pipeline; neither bypasses
app logic.
