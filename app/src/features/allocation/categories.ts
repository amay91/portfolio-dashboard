import type { Allocation } from '../../reference/fundMeta'

export type CatKey = keyof Allocation

export interface CatDef {
  label: string
  sub: string
  hex: string
}

// Colors are CSS variable references, not literal hex — --cat-* is defined
// per-theme in tokens.css, so the donut/legend/deck chart lines re-theme
// instantly with the dark/light toggle along with everything else, with no
// theme-awareness needed here (React inline styles resolve var() natively).
// See docs/DECISIONS.md "Dark/Light theme toggle".
export const CAT: Record<CatKey, CatDef> = {
  equity: { label: 'Equity', sub: 'Listed shares', hex: 'var(--cat-equity)' },
  debt: { label: 'Debt', sub: 'Bonds & fixed income', hex: 'var(--cat-debt)' },
  cash: { label: 'Cash', sub: 'Liquid & cash equivalents', hex: 'var(--cat-cash)' },
  other: { label: 'Other', sub: 'Arbitrage, commodities, REITs', hex: 'var(--cat-other)' },
}

export const CAT_ORDER: CatKey[] = ['equity', 'debt', 'cash', 'other']
