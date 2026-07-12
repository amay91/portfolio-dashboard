// Split out of InstructionsContent.tsx (was "Step 2 — read your dashboard")
// into its own top-level menu item — useful enough on its own that it
// shouldn't be buried inside the download-a-statement instructions.
export function ReadingDashboardContent() {
  return (
    <div className="help-body">
      <p>Once your statement is uploaded, everything below updates automatically:</p>
      <ol className="help-steps">
        <li>
          <b>Summary row.</b> Total Value, Total Invested, Total Gain (split into short-term and long-term), and your money-weighted return (XIRR) alongside a weighted CAGR —
          both compared against the Nifty 50 as a benchmark.
        </li>
        <li>
          <b>Value vs Invested chart.</b> How your money has grown against what you've put in, month by month since your very first investment — hover (or tap) any point for
          the exact figures on that date.
        </li>
        <li>
          <b>Top holdings and Allocation.</b> Your five largest positions, and a look-through breakdown of where your money actually sits — Equity, Debt, Cash, or Other
          (arbitrage, gold, REITs) — tap a slice for the funds behind it.
        </li>
        <li>
          <b>Portfolio Analysis.</b> Six deeper sections, opened from the buttons below the summary: the full <b>6-Chart Gallery</b> (calendar-year returns, rolling 1-year
          returns, net capital added, holdings by value, geographical concentration); <b>Full Holdings</b> and <b>Fund Houses</b> tables (sortable, every figure per scheme);{' '}
          <b>Fund Cards</b> (each scheme's key facts — category, expense ratio, exit load); <b>Data Sources</b> (exactly where each fund's live price came from, and why, if any
          are still on their statement price); and <b>Method Notes</b> (how every number on this page is actually calculated).
        </li>
        <li>
          <b>Portfolio Commentary.</b> A collapsible section — enter your <b>age</b> and <b>target retirement age</b> and it generates a personalized, plain-English read on
          whether your current equity/debt mix fits your actual time horizon, referencing well-known long-term investing principles. It's educational commentary, not financial
          advice.
        </li>
      </ol>
      <p>
        You can revisit any of this any time — <b>Refresh</b> re-fetches the latest fund prices without needing to re-upload, and <b>Clear Data — Reset Dashboard</b> returns to
        the built-in sample portfolio.
      </p>
    </div>
  )
}
