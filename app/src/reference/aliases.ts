// Known scheme renames. Each group lists the *core* (plan-stripped) normalised
// forms that refer to the same fund; matching and display collapse them to the
// first entry. ISIN is stable across renames and remains the primary key — these
// keep name-based matching working when a statement carries an old name (or a
// fund has no ISIN). Extend freely as new renames appear.
export const NAME_ALIAS_GROUPS: string[][] = [
  ['icici prudential arbitrage', 'icici prudential equity arbitrage'],
  ['nippon india arbitrage', 'reliance arbitrage', 'reliance arbitrage advantage'],
  ['aditya birla sun life arbitrage', 'aditya birla sun life enhanced arbitrage'],
  ['hdfc arbitrage', 'hdfc arbitrage wholesale'],
  ['hdfc flexi cap', 'hdfc equity'],
  ['hdfc large and mid cap', 'hdfc growth opportunities'],
  ['franklin india flexi cap', 'franklin india equity'],
  ['nippon india large cap', 'reliance large cap'],
  ['nippon india small cap', 'reliance small cap'],
  ['icici prudential value discovery', 'icici prudential value'],
  ['parag parikh flexi cap', 'parag parikh long term value'],
  ['icici prudential savings', 'icici prudential flexible income'],
  // Industry-wide ELSS renames (SEBI/AMC-driven, ~2023) — e.g. Axis Long Term
  // Equity Fund -> Axis ELSS Tax Saver Fund, effective 08-Dec-2023 (confirmed
  // via valueresearchonline.com; found via a real statement dated Jan 2022
  // where the old name no longer resolved against any live source — see
  // docs/DECISIONS.md "Old statements and fund renames").
  ['axis elss tax saver', 'axis long term equity'],
  // Quantum Equity Fund of Funds -> Quantum Diversified Equity All Cap Active
  // FOF (confirmed via mfapi.in, ISIN INF082J01093 unchanged) — found via a
  // real statement where the old name carried no ISIN at all, so even the
  // ISIN-fallback matching tier had nothing to fall back to; name matching
  // was the only path, and the rename swapped in enough new descriptive
  // words ("Diversified", "All Cap", "Active") that fuzzyLive's token-overlap
  // score fell well short of its 0.7 threshold.
  ['quantum diversified equity all cap active fof', 'quantum equity of funds'],
]
