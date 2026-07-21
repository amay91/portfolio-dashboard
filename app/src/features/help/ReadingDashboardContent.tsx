import type { ReactNode } from 'react'
import type { SpotlightRequest } from '../../ui/Spotlight'

interface ReadingItem {
  id: string
  label: string
  body: ReactNode
  targetIds: string[]
}

// One entry per dashboard region this panel explains — `targetIds` are the
// live `id` attributes added to each region's own component specifically
// for this (KpiRail.tsx, ValueVsInvestedCard.tsx, TopHoldings.tsx,
// CommandDeck.tsx's allocation card, PortfolioAnalysis.tsx,
// Commentary.tsx's outer <section>). "Top holdings and Allocation" has two,
// since it's one explanation covering two separate cards (stacked on
// mobile, side by side on desktop) — Spotlight.tsx highlights both and
// positions the one popover against their combined bounding box. Text kept
// verbatim from the original static list so the popover shown after a
// click says exactly what this menu already told the reader, not a
// paraphrase of it.
const ITEMS: ReadingItem[] = [
  {
    id: 'summary',
    label: 'Summary row.',
    body: 'Total Value, Total Invested, Total Gain (split into short-term and long-term), and your money-weighted return (XIRR) alongside a weighted CAGR — both compared against the Nifty 50 as a benchmark.',
    targetIds: ['deck-summary-row'],
  },
  {
    id: 'vvsi',
    label: 'Value vs Invested chart.',
    body: "How your money has grown against what you've put in, month by month since your very first investment — hover (or tap) any point for the exact figures on that date.",
    targetIds: ['deck-vvsi-card'],
  },
  {
    id: 'holdings-alloc',
    label: 'Top holdings and Allocation.',
    body: 'Your five largest positions, and a look-through breakdown of where your money actually sits — Equity, Debt, Cash, or Other (arbitrage, gold, REITs) — tap a slice for the funds behind it.',
    targetIds: ['deck-top-holdings', 'deck-allocation-card'],
  },
  {
    id: 'analysis',
    label: 'Portfolio Analysis.',
    body: (
      <>
        Six deeper sections, opened from the buttons below the summary: the full <b>6-Chart Gallery</b> (calendar-year returns, rolling 1-year returns, net capital added,
        holdings by value, geographical concentration); <b>Full Holdings</b> and <b>Fund Houses</b> tables (sortable, every figure per scheme); <b>Fund Cards</b> (each scheme's
        key facts — category, expense ratio, exit load); <b>Data Sources</b> (exactly where each fund's live price came from, and why, if any are still on their statement
        price); and <b>Method Notes</b> (how every number on this page is actually calculated).
      </>
    ),
    targetIds: ['portfolio-analysis'],
  },
  {
    id: 'commentary',
    label: 'Portfolio Commentary.',
    body: (
      <>
        A collapsible section — enter your <b>age</b> and <b>target retirement age</b> and it generates a personalized, plain-English read on whether your current equity/debt
        mix fits your actual time horizon, referencing well-known long-term investing principles. It's educational commentary, not financial advice.
      </>
    ),
    targetIds: ['commentary-sec'],
  },
]

// Split out of InstructionsContent.tsx (was "Step 2 — read your dashboard")
// into its own top-level menu item — useful enough on its own that it
// shouldn't be buried inside the download-a-statement instructions. Each
// item is now a real button: clicking it closes this modal, scrolls to and
// highlights the matching live section on the dashboard, and repeats this
// same explanatory text next to it (Spotlight.tsx) — so the reader can see
// exactly what the explanation is pointing at rather than having to find it
// themselves afterward.
export function ReadingDashboardContent({ onSpotlight }: { onSpotlight: (request: SpotlightRequest) => void }) {
  return (
    <div className="help-body">
      <p>Once your statement is uploaded, everything below updates automatically. Click any item to jump straight to it on the dashboard, highlighted:</p>
      <ol className="help-steps rd-list">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button className="rd-item-btn" onClick={() => onSpotlight({ targetIds: item.targetIds, label: item.label, body: item.body })}>
              <b>{item.label}</b> {item.body}
              <span className="rd-item-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p>
        You can revisit any of this any time — <b>Refresh</b> re-fetches the latest fund prices without needing to re-upload, and <b>Clear Data — Reset Dashboard</b> returns to
        the built-in sample portfolio.
      </p>
    </div>
  )
}
