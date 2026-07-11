import { fmtDate } from '../../format'

// "Method & caveats" — static content, ported from reference/engine.js
// renderNotes. Only the valuation-date paragraph is dynamic.
export function Notes({ valDate }: { valDate: Date }) {
  return (
    <div className="notes" id="notes-body">
      <p>
        <b>Valuation date.</b> {fmtDate(valDate)} — the latest NAV date carried in the statement. Market values are the AMC-stated values on that date.
      </p>
      <p>
        <b>All-time return.</b> The headline figure is the portfolio's compounded annual growth since inception — the money-weighted (XIRR) rate over every dated cash flow
        from your first investment to the valuation date. For a portfolio funded by contributions on many different dates this is the right "since inception" CAGR; a naive
        value÷cost rate would spread mostly-recent capital over the full span and understate the result. The <b>avg-period CAGR</b> beside it annualises the total gain over
        the amount-weighted average holding period instead.
      </p>
      <p>
        <b>Nifty 50 benchmark.</b> The comparison figures beside your XIRR come from a real, low-cost Nifty 50 index fund's actual NAV history (fetched from mfapi.in, the
        same source used for fund NAVs elsewhere) — not the raw NSE index level, since there's no reliable public API for that. This is a close but not exact proxy: an
        index fund carries a small tracking error and expense ratio (typically 0.1–0.3% a year) that the theoretical index doesn't. If no matching fund can be found or
        reached, the comparison is left blank rather than guessed.
      </p>
      <p>
        <b>Capital gains.</b> Unrealised gains are split short- vs long-term by each purchase lot's holding period: the long-term threshold is <b>12 months</b> for
        equity-taxed schemes and <b>24 months</b> for debt-taxed schemes. Note that debt-fund gains on units bought on or after 1 Apr 2023 are taxed at slab rates regardless
        of holding period; the STCG/LTCG split here reflects holding period only, not the latest debt-tax treatment.
      </p>
      <p>
        <b>Holdings carried in.</b> If a fund appears only as an opening balance with no purchases inside the statement period (and no Total Cost Value), its cost basis is
        unknown — its market value still counts toward the total and the allocation, but its cost, gain and return are shown as not available rather than guessed.
      </p>
      <p>
        <b>Exited positions.</b> Folios that have been fully redeemed (zero balance) are hidden from the holdings views to keep them focused on what you currently own. None
        of that history is discarded — every purchase and redemption from an exited fund still feeds the portfolio's realised gains and its money-weighted return since
        inception, so the all-time return reflects those round-trips too.
      </p>
      <p>
        <b>Look-through allocation.</b> Each scheme's market value is apportioned to Equity / Debt / Cash / Other using its most recent published portfolio mix. Arbitrage is
        shown under <b>Other</b> (market-neutral, fully hedged); liquid funds count as <b>Cash</b>; the multi-asset fund's commodity and REIT sleeve sits in <b>Other</b>.
        These weights are factsheet-date approximations and will drift as funds rebalance.
      </p>
      <p>
        <b>Reading the statement.</b> The dashboard accepts your CAS three ways: drop the <b>PDF</b> (extracted in your browser via pdf.js), drop a <b>MarkItDown{' '}
        <code>.md</code></b> file, or <b>paste MarkItDown text</b>. MarkItDown (Microsoft's document→Markdown converter) often reconstructs the CAS tables more cleanly than
        raw PDF text extraction; the parser normalises Markdown tables back into lines, so all three routes produce identical results. Nothing is uploaded — parsing happens
        entirely on your device.
      </p>
      <p>
        <b>Name changes.</b> Funds are matched to market data primarily by ISIN, which doesn't change when a scheme is renamed (e.g. "ICICI Prudential Equity Arbitrage Fund"
        → "ICICI Prudential Arbitrage Fund"), so historical analysis stays continuous and the latest NAV is still found. Where a statement carries no ISIN, an alias table
        and plan-aware name normalisation collapse old and new names to the same fund; when a rename is detected, the current name is shown.
      </p>
      <p>
        <b>Live valuation.</b> On upload — and whenever you press Refresh — the dashboard looks up the latest published NAV for each holding and revalues everything as of
        that date: market value, unrealised STCG/LTCG, XIRR, the all-time return and the allocation all move to current prices. NAVs come from AMFI's daily file (matched by
        ISIN) with mf.captnemo.in and mfapi.in as per-fund fallbacks by name; both are fetched in your browser. If a fund can't be matched or the network is unreachable,
        that holding keeps its statement NAV and the banner says so.
      </p>
      <p>
        <b>Ingestion.</b> The parser is tuned for the CAMS / KFintech consolidated statement layout and handles its common variants — values labelled either "Market Value"
        or "Valuation", fields on separate or merged lines, ISINs that wrap, and statements with no portfolio-summary table. Uploaded PDFs are read entirely in your browser
        — nothing is sent anywhere. Schemes not in the reference table fall back to a category estimate inferred from the scheme name.
      </p>
    </div>
  )
}
