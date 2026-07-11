# Name Overrides & Harmonisation Rules

This is the single, actively-maintained source of truth for every name-standardisation rule
applied by the dashboard — which raw statement text gets rewritten, into what, and where each
form is shown. **Update this file every time a new naming standardisation is added or an
existing one changes.** The implementation always lives in code (see the file pointers in each
section); this document is the human-readable index of *what* the rules are and *why*, not a
copy that can drift from it.

---

## 1. Fund House (AMC) Names

**Rule:** every AMC/fund-house name is harmonised to one of two canonical forms — a **Full
Name** and a **Short Name** — regardless of exactly how a given statement spelled or cased it.

**Where each form is shown:**
- **Short Name** — used everywhere in the dashboard *except* the one place below (Fund Cards,
  the Allocation drill-down, and anywhere else a fund house is mentioned).
- **Full Name** — used **only** in the "Fund Houses" section ("Allocation Across AMCs" table).

**Implementation:** `app/src/reference/fundHouses.ts`
- `FUND_HOUSE_NAMES: Record<string, string>` — the map below, full → short.
- `RAW_ALIASES: Record<string, string>` — known further-shortened variants a *statement itself*
  uses (distinct from the canonical map) — see "Known raw statement variants" below.
- `fundHouseFullName(house)` — canonical full name; applied **once, at the single point
  `Fund.house` is finally assigned** in `app/src/engine/scheme.ts`'s `analyzeScheme()`
  (`house: fundHouseFullName(meta.house || s.house)`), so every downstream field
  (`Fund.house`, `HouseSummary.house`, `Portfolio.contrib[].house`) is already canonical no
  matter which of the two upstream sources supplied it. Matching is case/whitespace-insensitive.
  An AMC not yet in the list falls through to the raw parsed string unchanged (never hidden).
  - **Caught live, not just in `s.house`:** an earlier version normalised only at parse time
    (`parsing/cas/parse.ts`, where `RE_HOUSE` captures the statement's own banner line) and
    still showed the raw "Kotak Mutual Fund" in the UI. Root cause: `analyzeScheme()` prefers a
    **hardcoded per-ISIN `house` field in `reference/fundMeta.ts`** over the statement-parsed
    value (`meta.house || s.house`) — that hardcoded table has its own (older, unharmonised)
    spelling for some AMCs, silently overriding the parse-time fix. Moved the fix to
    `analyzeScheme()`'s final assignment, which covers both sources at once, and removed the
    now-redundant parse-time call (one normalisation point, not two).
- `fundHouseShortName(house)` — the abbreviation; applied **at display time** in
  `features/holdings/FundCards.tsx` and `features/allocation/AllocationSection.tsx`.
  `features/houses/HousesTable.tsx` needs no call — the underlying data is already the canonical
  full name by the time it reaches that table.
- Tests: `app/src/reference/fundHouses.spec.ts`.

**The list** (Full Name → Short Name):

| Full Name (as CAMS/KFintech statements print it) | Short Name |
|---|---|
| 360 ONE Mutual Fund | 360 ONE MF |
| Abakkus Mutual Fund | Abakkus MF |
| Aditya Birla Sun Life Mutual Fund | Aditya Birla Sun Life MF |
| Axis Mutual Fund | Axis MF |
| Bajaj Finserv Mutual Fund | Bajaj Finserv MF |
| Bandhan Mutual Fund | Bandhan MF |
| Bank of India Mutual Fund | Bank of India MF |
| Baroda BNP Paribas Mutual Fund | Baroda BNP Paribas MF |
| Canara Robeco Mutual Fund | Canara Robeco MF |
| Capitalmind Mutual Fund | Capitalmind MF |
| DSP Mutual Fund | DSP MF |
| Edelweiss Mutual Fund | Edelweiss MF |
| Franklin Templeton Mutual Fund | Franklin Templeton MF |
| HDFC Mutual Fund | HDFC MF |
| HSBC Mutual Fund | HSBC MF |
| Helios Mutual Fund | Helios MF |
| ICICI Prudential Mutual Fund | **ICICI MF** *(irregular — not "ICICI Prudential MF")* |
| ITI Mutual Fund | ITI MF |
| Invesco Mutual Fund | Invesco MF |
| JM Financial Mutual Fund | JM Financial MF |
| Kotak Mahindra Mutual Fund *(statements sometimes shorten this to just "Kotak Mutual Fund" — see Known Raw Variants below)* | Kotak Mahindra MF |
| LIC Mutual Fund | LIC MF |
| Mahindra Manulife Mutual Fund | Mahindra Manulife MF |
| Mirae Asset Mutual Fund | Mirae Asset MF |
| Motilal Oswal Mutual Fund | Motilal Oswal MF |
| Navi Mutual Fund | Navi MF |
| Nippon India Mutual Fund | Nippon India MF |
| Old Bridge Mutual Fund | Old Bridge MF |
| PGIM India Mutual Fund | PGIM India MF |
| PPFAS Mutual Fund | PPFAS MF |
| Quant Mutual Fund | Quant MF |
| Quantum Mutual Fund | Quantum MF |
| SBI Mutual Fund | SBI MF |
| Samco Mutual Fund | Samco MF |
| Sundaram Mutual Fund | Sundaram MF |
| TRUST Mutual Fund | TRUST MF |
| Tata Mutual Fund | Tata MF |
| The Wealth Company Mutual Fund | The Wealth Company MF |
| UTI Mutual Fund | UTI MF |
| Union Mutual Fund | Union MF |
| WhiteOak Capital Mutual Fund | WhiteOak Capital MF |

**Known raw statement variants** (a real statement's own shortening, distinct from the canonical
list above — resolved via `RAW_ALIASES` in `fundHouses.ts`, checked before the exact-match
lookup):

| Raw text as parsed | Resolves to |
|---|---|
| Kotak Mutual Fund | Kotak Mahindra Mutual Fund |

Found by auditing every real fixture's parsed `house` values against the canonical list — do
that same audit (parse each fixture, diff the distinct `house` strings against
`FUND_HOUSE_NAMES`' keys) whenever a new fixture is added, and add any new variant found here.

**Adding a new AMC:** add one row to `FUND_HOUSE_NAMES` in `fundHouses.ts` *and* one row to the
table above, in the same commit. An AMC missing from the list still displays (raw, un-harmonised)
rather than breaking — but it won't get the Short/Full treatment until added here.

---

## 2. Scheme Names

**Rule:** every scheme name is harmonised into two canonical forms carrying the **same 3 pieces
of information** — base scheme name, Direct/Regular plan, Growth/Dividend option — regardless of
how inconsistently the original statement phrased it (e.g. "- Direct Plan - Growth" vs the
combined "- Direct Growth" vs no plan word at all).

| Form | Format | Example |
|---|---|---|
| **Long Name** | `[Scheme Name] - [Direct/Regular] Plan - [Growth/Dividend]` | `ICICI Prudential Multi-Asset Fund - Direct Plan - Growth` |
| **Short Name** | `[Scheme Name] - Dir/Reg (G/D)` | `ICICI Prudential Multi-Asset Fund - Dir (G)` |

Additional worked example:
- Long: `ICICI Prudential All Seasons Bond Fund - Regular Plan - Dividend`
- Short: `ICICI Prudential All Seasons Bond Fund - Reg (D)`

**Parsing rules** (`parseSchemeName()`):
- **Plan:** "Direct" if the raw name contains the word "direct" (any case); otherwise "Regular"
  — statements that omit the plan entirely default to Regular, matching the existing
  `engine/harmonise.ts` convention (`planKey()`).
- **Option:** "Dividend" if the raw name contains "idcw", "dividend", "payout", or
  "reinvestment"; otherwise "Growth".
- **Base name:** the raw name with the plan/option suffix stripped, via `shortName()` (strips
  everything from a "- Direct"/"- Regular" marker onward, then drops any parenthetical like
  "(Non Demat)"), plus an extra strip for a bare trailing "- Growth"/"- Dividend" with no
  preceding plan word. A sub-plan qualifier that *precedes* the Direct/Regular marker (e.g.
  HDFC Retirement Savings Fund's "**Equity Plan**") is preserved, since it's part of the fund's
  real identity, not plan/option boilerplate.

**Implementation:** `app/src/format.ts`
- `shortName(name)` — base-name extractor (no plan/option info; used where only a bare fund
  name is wanted, e.g. chart bar labels, the commentary's "your largest holding" mention).
- `parseSchemeName(name)` → `{ base, plan, option }`.
- `longSchemeName(name)`, `shortSchemeName(name)`.
- Tests: `app/src/format.spec.ts`.

**Where each form is shown:**
- **Short Name** — the deck's lean "Holding" table (`features/deck/TopHoldings.tsx`) and the
  "Full Holdings" / "Every Scheme At A Glance" table (`features/holdings/HoldingsTable.tsx`,
  including its sort key and the exited-positions footnote).
- **Long Name** — not currently used anywhere in the UI (available for future use — e.g. Fund
  Cards or Data Sources, if those are ever asked to spell the plan/option out in full).
- Everywhere else that only needs the bare fund name (no plan/option) — charts, commentary —
  keeps using plain `shortName()` (no plan/option suffix at all), which is a *different*,
  older, and still-valid concept from the Long/Short pair above. Don't confuse the two.

**Column-wrap note:** the Holding tables also gained `table-layout: fixed` +
`white-space: nowrap` on their numeric columns so figures like "+₹2,45,952" can't break
mid-number — see `app/src/ui/deck.css`'s `.deck-tbl` rules. This is a layout fix, not a naming
rule, but it's the reason the ShortName switch was needed in the first place (the raw long
statement names were crowding the numeric columns).

---

## 3. Maintenance

- Add a new section here for any future name-standardisation category (e.g. folio labels,
  transaction-type labels) the moment it's implemented — don't let this file lag the code.
- Every section must say: the exact rule, the canonical mapping/algorithm, which file(s)
  implement it, and where in the UI each form (if there's more than one) is displayed.
- Cross-reference `tasks.md`'s revision notes for the *history* of when/why a rule was added;
  this file only needs to state the *current* rule.
