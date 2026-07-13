// Point-of-use explanations for the financial terms the dashboard shows
// (review item A1). Same facts as FaqContent/Notes, cut to popover length —
// the FAQ stays the fuller reference; these exist so a term is explained at
// the exact moment it's read, without a trip to the Help menu. Layperson
// first: no formula, no further jargon inside an explanation.
export const EXPLAIN = {
  totalValue: 'Everything your funds are worth right now, at the latest available prices. The line under it shows how that compares with the total you put in.',
  totalGain:
    'How much your investments have grown beyond what you put in. Short Term vs Long Term splits that by how long each batch of units has been held — which decides the tax rate if you ever sell (held over 12 months counts as long-term for equity funds, 24 for debt).',
  xirr: 'Your personal annual growth rate. Unlike a simple average, it accounts for exactly when you added or withdrew money — making it the fairest single measure of how your investing has actually gone. The Nifty 50 figure alongside shows what the market returned over the same period.',
  cagr: 'The average yearly growth rate — the steady annual return that would have produced this result.',
  wtdCagr: 'This fund’s average yearly growth since your first purchase in it, weighted by when your money actually went in — so a recent large investment doesn’t distort the rate.',
  nav: 'Net Asset Value — the price of one unit of a fund, published each trading day. Your holding’s worth is simply units held × NAV.',
  navDate: 'The date of the price used to value this holding. “Live” means today’s published price; “Statement” means the price printed in your uploaded statement.',
  avgCost: 'On average, what you paid per unit across all your purchases of this fund.',
  stltGain: 'Gains are split by holding period because tax treats them differently: units held under the threshold (12 months for equity funds, 24 for debt) count as short-term; older units count as long-term, usually taxed at a lower rate.',
  expenseRatio:
    'The yearly fee the fund house charges, quietly deducted from the fund’s returns before you see them. Lower is better — cost is one of the few things about a fund you can fully control.',
  exitLoad: 'A fee charged only if you sell within a set period of buying (commonly 1% within a year). After that window, selling costs nothing.',
  riskometer: 'SEBI’s standard risk label, from Low to Very High. It describes how much the fund’s value can swing — not whether the fund is good or bad.',
  benchmark: 'The market index this fund tries to beat. Comparing the fund’s return against its benchmark tells you whether it has earned its fees.',
} as const

export type ExplainerKey = keyof typeof EXPLAIN
