// Fund metadata (category, look-through allocation, KIM/SID facts), keyed by
// ISIN. Allocation weights are approximate, sourced from recent fund
// factsheets / portfolio disclosures (2025-26) and sum to ~1.0 per fund. They
// drive the look-through Equity/Debt/Cash/Other split. taxClass picks the
// LTCG cutoff (see engine/gains.ts ltcgMonths). Hand-curated for funds seen so
// far in the fixtures — approximate, and only covers funds encountered.
// Ported verbatim from reference/engine.js FUND_META.

export interface Allocation {
  equity: number
  debt: number
  cash: number
  other: number
}

export interface FundMeta {
  house: string
  category: string
  taxClass: 'equity' | 'debt'
  alloc: Allocation
  benchmark: string
  risk: string
  expense: string
  exit: string
  launch: string
  amc: string
  note: string
  geo?: Record<string, number>
}

export const FUND_META: Record<string, FundMeta> = {
  INF760K01JC6: {
    house: 'Canara Robeco Mutual Fund', category: 'Equity – Small Cap', taxClass: 'equity',
    alloc: { equity: 0.93, debt: 0, cash: 0.07, other: 0 },
    benchmark: 'BSE 250 SmallCap TRI', risk: 'Very High', expense: '0.49% (Direct)',
    exit: '1% if redeemed within 365 days, else Nil', launch: 'Feb 2019',
    amc: 'https://www.canararobeco.com/mutual-fund/equity-funds/canara-robeco-small-cap-fund',
    note: 'Invests predominantly in small-cap companies for long-term capital appreciation.',
  },
  INF090I01569: {
    house: 'Franklin Templeton Mutual Fund', category: 'Equity – Small Cap', taxClass: 'equity',
    alloc: { equity: 0.93, debt: 0, cash: 0.07, other: 0 },
    benchmark: 'Nifty Smallcap 250 TRI', risk: 'Very High', expense: '~1.0% (Direct)',
    exit: '1% if redeemed within 1 year, else Nil', launch: 'Jan 2006',
    amc: 'https://www.franklintempletonindia.com/',
    note: 'Holding fully redeemed in May 2018 – retained for realised-gain history.',
  },
  INF179KB1MF0: {
    house: 'HDFC Mutual Fund', category: 'Solution – Retirement (Equity Plan)', taxClass: 'equity',
    alloc: { equity: 0.915, debt: 0.005, cash: 0.08, other: 0 },
    benchmark: 'NIFTY 500 TRI', risk: 'Very High', expense: '0.74% (Direct)',
    exit: 'Nil after 5-year lock-in (lock-in or age 60)', launch: 'Feb 2016',
    amc: 'https://www.hdfcfund.com/explore/mutual-funds/hdfc-retirement-savings-fund-equity-plan/direct',
    note: 'Notified retirement scheme with a 5-year lock-in; qualifies for Sec 80C.',
  },
  INF109K016E5: {
    house: 'ICICI Prudential Mutual Fund', category: 'Debt – Dynamic Bond', taxClass: 'debt',
    alloc: { equity: 0, debt: 0.88, cash: 0.12, other: 0 },
    benchmark: 'Nifty Composite Debt Index', risk: 'Moderate', expense: '0.55% (Direct)',
    exit: '0.25% if redeemed within 1 month, else Nil', launch: 'May 2009',
    amc: 'https://www.icicipruamc.com/mutual-fund/debt-funds/icici-prudential-all-seasons-bond-fund/55',
    note: 'Dynamically managed duration across the yield curve (formerly Long Term Plan).',
  },
  INF109K016O4: {
    house: 'ICICI Prudential Mutual Fund', category: 'Hybrid – Arbitrage', taxClass: 'equity',
    alloc: { equity: 0, debt: 0, cash: 0, other: 1.0 },
    benchmark: 'Nifty 50 Arbitrage Index', risk: 'Low', expense: '0.40% (Direct)',
    exit: '0.25% if redeemed within 1 month, else Nil', launch: 'Dec 2006',
    amc: 'https://www.icicipruamc.com/mutual-fund/hybrid-funds/icici-prudential-equity-arbitrage-fund/55',
    note: 'Market-neutral: cash-futures arbitrage, fully hedged equity. Classified as Other.',
  },
  INF109K015K4: {
    house: 'ICICI Prudential Mutual Fund', category: 'Hybrid – Multi Asset', taxClass: 'equity',
    alloc: { equity: 0.57, debt: 0.135, cash: 0.175, other: 0.12 },
    benchmark: 'Nifty 200 TRI 65% + Debt 25% + Commodity', risk: 'Very High', expense: '1.07% (Direct)',
    exit: 'Up to 30% free in 1 yr; 1% on excess within 1 yr', launch: 'Jan 2013',
    amc: 'https://www.icicipruamc.com/mutual-fund/hybrid-funds/icici-prudential-multi-asset-fund/55',
    geo: { India: 0.85, 'United States': 0.03, 'Gold & Commodities': 0.12 },
    note: 'Equity + debt + commodities (gold/silver) + REITs. Other = commodity & REIT sleeve.',
  },
  INF174K01211: {
    house: 'Kotak Mutual Fund', category: 'Equity – Small Cap', taxClass: 'equity',
    alloc: { equity: 0.96, debt: 0, cash: 0.04, other: 0 },
    benchmark: 'Nifty Smallcap 250 TRI', risk: 'Very High', expense: '0.49% (Direct) / ~1.6% (Regular)',
    exit: '1% on units above 10% if redeemed within 1 year', launch: 'Feb 2005',
    amc: 'https://www.kotakmf.com/mutual-funds/equity-funds/kotak-small-cap-fund',
    note: 'SIP cancelled Jun 2025; held as a Regular plan.',
  },
  INF879O01068: {
    house: 'PPFAS Mutual Fund', category: 'Debt – Liquid', taxClass: 'debt',
    alloc: { equity: 0, debt: 0, cash: 1.0, other: 0 },
    benchmark: 'CRISIL Liquid Debt Index', risk: 'Low to Moderate', expense: '0.26% (Direct)',
    exit: 'Graded, Nil from day 7', launch: 'May 2021',
    amc: 'https://amc.ppfas.com/schemes/parag-parikh-liquid-fund/',
    note: 'Liquid fund treated as cash equivalent for allocation.',
  },
  INF879O01027: {
    house: 'PPFAS Mutual Fund', category: 'Equity – Flexi Cap', taxClass: 'equity',
    alloc: { equity: 0.80, debt: 0.03, cash: 0.12, other: 0.05 },
    benchmark: 'Nifty 500 TRI', risk: 'Very High', expense: '0.63% (Direct)',
    exit: '2% within 365 days; 1% 366–730 days; Nil after', launch: 'May 2013',
    amc: 'https://amc.ppfas.com/schemes/parag-parikh-flexi-cap-fund/',
    geo: { India: 0.80, 'United States': 0.17, 'Other International': 0.03 },
    note: 'Flexi-cap with a meaningful overseas-equity sleeve; carries notable cash/arbitrage. Weights are factsheet estimates.',
  },
  INF879O01266: {
    house: 'PPFAS Mutual Fund', category: 'Hybrid – Dynamic Asset Allocation', taxClass: 'equity',
    alloc: { equity: 0.45, debt: 0.25, cash: 0.10, other: 0.20 },
    benchmark: 'CRISIL Hybrid 50+50 Moderate Index', risk: 'Very High', expense: '0.49% (Direct)',
    exit: '10% free within 1 yr; 1% on excess within 1 yr', launch: 'Feb 2024',
    amc: 'https://amc.ppfas.com/schemes/parag-parikh-dynamic-asset-allocation-fund/',
    geo: { India: 0.95, 'United States': 0.05 },
    note: 'Balanced-advantage style; net equity flexes with valuations, hedged sleeve shown as Other.',
  },
  INF879O01225: {
    house: 'PPFAS Mutual Fund', category: 'Hybrid – Arbitrage', taxClass: 'equity',
    alloc: { equity: 0, debt: 0, cash: 0, other: 1.0 },
    benchmark: 'Nifty 50 Arbitrage Index', risk: 'Low', expense: '0.35% (Direct)',
    exit: '0.25% if redeemed within 30 days, else Nil', launch: 'Sep 2025',
    amc: 'https://amc.ppfas.com/schemes/parag-parikh-arbitrage-fund/',
    note: 'Market-neutral cash-futures arbitrage; classified as Other.',
  },
  INF109K012B0: {
    house: 'ICICI Prudential Mutual Fund', category: 'Hybrid – Balanced Advantage', taxClass: 'equity',
    alloc: { equity: 0.50, debt: 0.25, cash: 0.10, other: 0.15 },
    benchmark: 'CRISIL Hybrid 50+50 Moderate Index', risk: 'Very High', expense: '0.86% (Direct)',
    exit: '30% free within 1 yr; 1% on excess within 1 yr', launch: 'Dec 2006',
    amc: 'https://www.icicipruamc.com/mutual-fund/hybrid-funds/icici-prudential-balanced-advantage-fund/55',
    note: 'Dynamically managed net equity; unhedged equity in Equity, hedged sleeve in Other. Weights are estimates.',
  },
  INF109K012M7: {
    house: 'ICICI Prudential Mutual Fund', category: 'Equity – Index (Nifty 50)', taxClass: 'equity',
    alloc: { equity: 0.995, debt: 0, cash: 0.005, other: 0 },
    benchmark: 'Nifty 50 TRI', risk: 'Very High', expense: '0.17% (Direct)',
    exit: 'Nil', launch: 'Feb 2002',
    amc: 'https://www.icicipruamc.com/mutual-fund/index-funds/icici-prudential-nifty-50-index-fund/55',
    note: 'Passive Nifty 50 tracker; held fully invested in equity.',
  },
  INF109K01O82: {
    house: 'ICICI Prudential Mutual Fund', category: 'Debt – Low Duration (Savings)', taxClass: 'debt',
    alloc: { equity: 0, debt: 0.9, cash: 0.1, other: 0 },
    benchmark: 'NIFTY Low Duration Debt Index', risk: 'Moderate', expense: '0.40% (Direct)',
    exit: 'Nil', launch: 'Sep 2002',
    amc: 'https://www.icicipruamc.com/mutual-fund/debt-funds/icici-prudential-savings-fund/55',
    note: 'Low-duration debt (formerly Flexible Income Plan). Position fully switched out.',
  },
  INF090I01PD7: {
    house: 'Franklin Templeton Mutual Fund', category: 'Hybrid – Equity Savings', taxClass: 'equity',
    alloc: { equity: 0.35, debt: 0.30, cash: 0.05, other: 0.30 },
    benchmark: 'NIFTY Equity Savings Index', risk: 'Moderately High', expense: '~0.6% (Direct)',
    exit: 'Nil (w.e.f 11-Oct-2021)', launch: 'Sep 2018',
    amc: 'https://www.franklintempletonindia.com/',
    note: 'Position switched out in Jan 2020 – retained for realised-gain history.',
  },
  INF090I01GV8: {
    house: 'Franklin Templeton Mutual Fund', category: 'Debt – Money Market', taxClass: 'debt',
    alloc: { equity: 0, debt: 0, cash: 1.0, other: 0 },
    benchmark: 'CRISIL Money Market Index', risk: 'Low to Moderate', expense: '~0.2% (Direct)',
    exit: 'Nil', launch: 'Feb 2002',
    amc: 'https://www.franklintempletonindia.com/',
    note: 'Fully redeemed in Mar 2020 – retained for realised-gain history.',
  },
  INF090I01JA6: {
    house: 'Franklin Templeton Mutual Fund', category: 'Debt – Ultra Short', taxClass: 'debt',
    alloc: { equity: 0, debt: 0.9, cash: 0.1, other: 0 },
    benchmark: 'CRISIL Ultra Short Term Debt Index', risk: 'Moderate', expense: '—',
    exit: 'Nil', launch: 'Jun 2003',
    amc: 'https://www.franklintempletonindia.com/',
    note: 'Wound down via the 2020 segregated-portfolio process (Vodafone Idea exposure).',
  },
  INF090I01VK0: {
    house: 'Franklin Templeton Mutual Fund', category: 'Debt – Segregated Portfolio', taxClass: 'debt',
    alloc: { equity: 0, debt: 0, cash: 0, other: 0 },
    benchmark: '—', risk: 'High', expense: '—',
    exit: '—', launch: 'Jan 2020',
    amc: 'https://www.franklintempletonindia.com/',
    note: 'Side-pocket for the 8.25% Vodafone Idea bond; extinguished after recoveries.',
  },
}

// Heuristic fallback for schemes not in the table (e.g. other uploaded PDFs).
export function inferMeta(name: string): FundMeta {
  const n = name.toLowerCase()
  const cat = (label: string, alloc: Allocation, tax: 'equity' | 'debt'): FundMeta => ({
    house: '', category: label, taxClass: tax, alloc, benchmark: '—', risk: '—',
    expense: '—', exit: '—', launch: '—',
    amc: 'https://www.google.com/search?q=' + encodeURIComponent(name + ' scheme information document'),
    note: 'Category inferred from scheme name; allocation is a category estimate.',
  })
  if (/arbitrage/.test(n)) return cat('Hybrid – Arbitrage', { equity: 0, debt: 0, cash: 0, other: 1 }, 'equity')
  if (/liquid|overnight|money market/.test(n)) return cat('Debt – Liquid', { equity: 0, debt: 0, cash: 1, other: 0 }, 'debt')
  if (/gilt|bond|debt|duration|credit|income|dynamic bond|corporate|treasury|ultra short|low duration|savings fund/.test(n))
    return cat('Debt', { equity: 0, debt: 0.9, cash: 0.1, other: 0 }, 'debt')
  if (/multi[\s-]?asset/.test(n)) return cat('Hybrid – Multi Asset', { equity: 0.55, debt: 0.2, cash: 0.13, other: 0.12 }, 'equity')
  if (/balanced advantage|dynamic asset|aggressive hybrid|equity savings|hybrid|balanced/.test(n))
    return cat('Hybrid', { equity: 0.6, debt: 0.25, cash: 0.15, other: 0 }, 'equity')
  if (/gold|silver|commodity/.test(n)) return cat('Commodity', { equity: 0, debt: 0, cash: 0.05, other: 0.95 }, 'debt')
  return cat('Equity', { equity: 0.95, debt: 0, cash: 0.05, other: 0 }, 'equity') // default
}
