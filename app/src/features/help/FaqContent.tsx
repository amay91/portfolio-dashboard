// FAQ content. Layperson explanation first, then the exact formula this
// dashboard actually uses (not a textbook approximation) for anyone who
// wants to verify or recreate a figure by hand — sourced directly from
// engine/xirr.ts, engine/series.ts (buildPortfolioSeries' dietz()),
// engine/gains.ts, features/allocation/categories.ts + engine/scheme.ts,
// and features/commentary/commentaryText.ts. Some of this overlaps with
// Method Notes (Portfolio Analysis) by design — this is the fuller,
// layperson-first version of the same facts.
export function FaqContent() {
  return (
    <div className="help-body">
      <h4 className="help-faq-q">1. What is XIRR, and how is it calculated?</h4>
      <p>
        XIRR (extended internal rate of return) answers one question: <i>"what single, constant annual growth rate would explain exactly how my money grew, given precisely
        when and how much I put in and took out?"</i> It's the right way to measure returns for a real portfolio, because you almost certainly didn't invest a single lump sum
        on day one — you added money on different dates, maybe pulled some out too, and XIRR accounts for the exact timing and size of every one of those transactions rather
        than just comparing a start value to an end value.
      </p>
      <p>
        A simple example: if you'd invested a lump sum and it merely doubled over exactly 8 years, that's a ~9.1% annual rate. But if instead you added money gradually over
        those 8 years, the same doubling implies a <i>higher</i> annual rate, because your money spent less time invested on average. XIRR correctly accounts for this — a
        naive "value ÷ cost" calculation would not.
      </p>
      <div className="help-formula">
        <div className="help-formula-label">Formula</div>
        XIRR is the rate <code>r</code> that satisfies:
        <br />
        <br />
        0 = Σᵢ CFᵢ / (1 + r)^((dᵢ − d₀) / 365)
        <br />
        <br />
        where <code>CFᵢ</code> is each cash flow (negative for money you put in, positive for money taken out or the current market value on the valuation date), and{' '}
        <code>dᵢ</code> is the date of that flow, counted in days from the first flow's date <code>d₀</code>. There's no algebraic way to solve for <code>r</code> directly —
        this dashboard finds it numerically: it first tries the <b>bisection method</b> (repeatedly halving a search range between −99.99% and +10,000% until the equation
        above is within 0.0001 of zero), falling back to <b>Newton's method</b> for cash-flow patterns that don't bracket a root in that range (for example, if every flow is
        positive or every flow is negative).
      </div>

      <h4 className="help-faq-q">2. What are Rolling Returns, and how are they calculated?</h4>
      <p>
        Instead of one single return figure for your whole portfolio history, Rolling Returns show you the return over <i>every</i> trailing 12-month window, recomputed once a
        month across your whole investment history. In other words: "if you'd looked at your portfolio exactly one year before this point, and again one year before that, and
        so on — what would each of those one-year returns have been?" This reveals how <i>consistent</i> your returns have actually been, rather than hiding good and bad years
        inside one long-run average. Until you've been invested a full year, the chart instead shows your since-inception return-to-date (dashed), since a "1-year" figure
        wouldn't yet be a true one-year window.
      </p>
      <div className="help-formula">
        <div className="help-formula-label">Formula</div>
        Each point uses the <b>Modified Dietz</b> method — a money-weighted return that accounts for exactly when cash entered or left during the window, without needing daily
        valuations (which a statement doesn't provide):
        <br />
        <br />
        R = (V₁ − V₀ − F) / (V₀ + Σⱼ Fⱼ × Wⱼ)
        <br />
        <br />
        where <code>V₀</code>/<code>V₁</code> are the portfolio's value at the start/end of the 12-month window, <code>F</code> is the sum of every external cash flow{' '}
        <code>Fⱼ</code> during that window (contributions positive, withdrawals negative), and each flow is <b>time-weighted</b> by <code>Wⱼ = (T − tⱼ) / T</code> — the
        fraction of the window that flow spent invested (<code>T</code> is the window's length, <code>tⱼ</code> the flow's date measured from the window's start). A rupee
        invested on day one of the window counts fully; a rupee invested the day before the window ends counts almost not at all — which is exactly right, since it's barely
        had time to earn (or lose) anything.
      </div>

      <h4 className="help-faq-q">3. What is the ST-LT split?</h4>
      <p>
        Short-Term (ST) vs Long-Term (LT) is a distinction that matters for Indian capital-gains tax: how long you've held a specific batch of units before selling (or, for
        unrealised gains, before today) determines which tax rate applies. Units held longer than the threshold qualify for the (usually lower) long-term rate; units held
        for less are taxed as short-term. The dashboard doesn't decide your tax bill — it simply classifies your existing unrealised gains into these two buckets so you know
        roughly where you stand.
      </p>
      <div className="help-formula">
        <div className="help-formula-label">Formula &amp; method</div>
        The long-term threshold is <b>12 months</b> for equity-taxed schemes and <b>24 months</b> for debt-taxed schemes (each fund's tax class comes from its category — see
        Asset Allocation below). For each individual purchase (a "lot"), the dashboard checks the holding period against that threshold:
        <br />
        <br />
        months held = (valuation date − purchase date) in years × 12
        <br />
        if months held &gt; threshold → gain counted as LTCG, else STCG
        <br />
        <br />
        Every surviving purchase lot's gain — <code>units remaining × (current NAV − purchase price)</code> — is added to whichever bucket its own holding period lands in, then
        the two buckets are summed across all your holdings. If some units from a fund were sold, each remaining lot's units are scaled down proportionally by the fraction
        still held, since a statement's totals don't preserve which exact units were sold. Note: gains on <i>debt</i> fund units bought on or after 1 April 2023 are actually
        taxed at your income slab rate regardless of holding period under current law — the split shown here still reflects holding period only, not that specific rule.
      </div>

      <h4 className="help-faq-q">4. What is the objective of the Portfolio Commentary section?</h4>
      <p>
        Portfolio Commentary is a personalized, plain-English read on whether your current equity/debt mix broadly fits how long you have until retirement — not a
        recommendation to buy or sell anything, and not personalised financial advice. You give it two numbers, your <b>current age</b> and your <b>target retirement age</b>,
        and it works out how many years that leaves you, then explains what that horizon typically implies for how much short-term risk (mainly, how much of your money is in
        equity) a portfolio can reasonably carry — the core idea being that a longer runway gives you more time to recover from a market downturn, so it can usually afford
        more growth-oriented (equity-heavy) positioning.
      </p>
      <p>
        It then compares that suggested range against your <i>actual</i> allocation, geography, and concentration (how much sits in your single largest holding), and calls out
        anything worth a second look — for example, being noticeably more conservative or more aggressive than your horizon suggests, a very large single holding, or very
        little international exposure. It closes with a short explanation of core long-term investing principles (favouring low-cost index funds, staying diversified, and not
        reacting to short-term volatility) with links to further reading, and an explicit disclaimer that this is general education generated from rules of thumb, not
        individual advice.
      </p>
      <div className="help-formula">
        <div className="help-formula-label">Method</div>
        Years to horizon <code>z = target retirement age − current age</code>. That number places you into one of seven lifecycle stages (for example, <code>z ≥ 25</code>{' '}
        years → "early accumulation", suggested equity band ~85–100%; <code>z &lt; 0</code> → "in / past your target date", suggested band ~30–50%), each with its own
        pre-set equity range. As a cross-check, it also shows <b>Bogle's "roughly your age in bonds"</b> rule of thumb: suggested equity % = <code>max(25, min(75, 100 −
        age))</code> — clamped so it never recommends below 25% or above 75% in stocks, exactly as Bogle himself qualified it. Your actual equity/debt/cash/other percentages
        (see Asset Allocation below) are then compared against the stage's suggested band to generate the specific commentary you see.
      </div>

      <h4 className="help-faq-q">5. What is Asset Allocation?</h4>
      <p>
        Asset Allocation is how your total invested money is spread across four broad categories: <b>Equity</b> (shares in companies — higher long-run growth potential, but
        more volatile), <b>Debt</b> (bonds and other fixed-income instruments — steadier, lower expected growth), <b>Cash</b> (liquid funds and cash-equivalents — very low
        risk, very low return), and <b>Other</b> (arbitrage strategies, gold/commodities, REITs — a mixed bucket that doesn't fit neatly into the first three). This split is
        one of the single biggest drivers of both how much your portfolio can be expected to grow over time and how much it might swing in value along the way.
      </p>
      <p>
        Mutual funds themselves generally aren't 100% one category — even an "equity fund" typically holds a small cash buffer, and a "hybrid" or "multi-asset" fund
        deliberately blends several categories. So the dashboard doesn't just label each fund a single category; it looks through to each fund's actual published portfolio
        mix and apportions its rupee value across all four buckets accordingly.
      </p>
      <div className="help-formula">
        <div className="help-formula-label">Formula</div>
        For each fund, using its most recently published category weights (equity / debt / cash / other, each a percentage that sums to 100% for that fund):
        <br />
        <br />
        fund's contribution to category X = fund's current market value × fund's category-X weight
        <br />
        <br />
        Summing that across every fund you hold gives the portfolio's total rupee amount in each of the four categories; dividing each by your total portfolio value gives the
        percentages shown in the Allocation donut. Arbitrage strategies are counted under <b>Other</b> (they're market-neutral and hedged, not a directional equity bet, even
        though the underlying instruments are shares); liquid funds count fully as <b>Cash</b>. These category weights are factsheet-date estimates and will drift slightly as
        funds themselves rebalance their own holdings over time.
      </div>
    </div>
  )
}
