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
- `FUND_HOUSE_NAMES: Record<string, string>` — the canonical full → short map (see below).
- `RAW_ALIASES: Record<string, string>` — known further-shortened variants a *statement itself*
  uses (distinct from the canonical map, e.g. "Kotak Mutual Fund" → "Kotak Mahindra Mutual Fund").
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

**The list** (Full Name → Short Name), and the known raw-statement shortenings that resolve to a
canonical full name before lookup, live solely in `app/src/reference/fundHouses.ts` —
`FUND_HOUSE_NAMES` and `RAW_ALIASES` respectively. *(Review item E1: this section used to carry a
second, hand-copied table of the same 40 AMCs — real duplication risk, since nothing enforced the
two staying in sync. `fundHouses.ts` is now the single source of the actual mapping data; this
file documents the rule, the "why," and where each form is displayed, not the data itself.)*

**Adding a new AMC:** add one row to `FUND_HOUSE_NAMES` in `fundHouses.ts` — that's the only place
it needs to go. An AMC missing from the list still displays (raw, un-harmonised) rather than
breaking, but won't get the Short/Full treatment until added. A new raw-statement shortening
(like "Kotak Mutual Fund" for "Kotak Mahindra Mutual Fund") goes in `RAW_ALIASES` the same way —
found by auditing every real fixture's parsed `house` values against `FUND_HOUSE_NAMES`' keys
whenever a new fixture is added.

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
