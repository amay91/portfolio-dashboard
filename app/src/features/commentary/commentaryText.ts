import { escapeHtml, inr, shortName } from '../../format'
import type { Portfolio } from '../../engine/types'

export interface CommentaryBand {
  lo: number
  hi: number
  stage: string
  bogleEq: number
}

// Horizon-tailored equity band + Bogle's "age in bonds" cross-check.
// Ported from reference/engine.js commentaryBand.
export function commentaryBand(age: number, z: number): CommentaryBand {
  let lo: number
  let hi: number
  let stage: string
  if (z >= 25) {
    lo = 85
    hi = 100
    stage = 'early accumulation'
  } else if (z >= 15) {
    lo = 75
    hi = 90
    stage = 'mid accumulation'
  } else if (z >= 10) {
    lo = 65
    hi = 80
    stage = 'late accumulation'
  } else if (z >= 6) {
    lo = 55
    hi = 70
    stage = 'the pre-retirement transition'
  } else if (z >= 3) {
    lo = 45
    hi = 60
    stage = 'approaching retirement'
  } else if (z >= 0) {
    lo = 40
    hi = 55
    stage = 'at retirement’s door'
  } else {
    lo = 30
    hi = 50
    stage = 'in / past your target date'
  }
  const bogleEq = Math.max(25, Math.min(75, 100 - age))
  return { lo, hi, stage, bogleEq }
}

// Collapsible Portfolio Commentary body: age/retirement-year horizon ->
// bands, glide-path explainer, portfolio assessment vs the user's actual
// allocation/geography, Bogle/Boglehead lens + references + disclaimer.
// Returns an HTML string (rendered via a scoped dangerouslySetInnerHTML) —
// any statement-derived fund name is escaped before interpolation. Ported
// from reference/engine.js buildCommentaryHTML.
export function buildCommentaryHTML(age: number, retireAge: number, pf: Portfolio | null): string {
  const z = retireAge - age
  const B = commentaryBand(age, z)
  const has = pf && isFinite(pf.totalValue) && pf.totalValue > 0
  const P: string[] = []
  P.push(`<span class="co-tag">Your horizon</span>`)
  P.push(
    `<p>You’re <b>${age}</b>, targeting retirement at age <b>${retireAge}</b> — about <b>${z} year${z === 1 ? '' : 's'}</b> away. That places you in <b>${B.stage}</b>. Horizon, more than age alone, drives how much short-term risk your portfolio can rationally carry: the longer the runway, the more time to ride out (and buy through) the market’s inevitable declines.</p>`,
  )
  P.push(`<h4>What your horizon implies for risk</h4>`)
  let body: string
  if (z >= 25)
    body = `With decades ahead, your biggest asset isn’t your portfolio — it’s your <b>future earnings</b> (“human capital”), which behaves like a bond and cushions a volatile equity portfolio. This is the textbook time to be <b>equity-heavy (~${B.lo}–${B.hi}%)</b> and treat crashes as discounted buying, not disasters. Bonds and large cash piles mostly cost you compounding at this stage.`
  else if (z >= 15)
    body = `You still have a long runway, so growth should dominate (<b>~${B.lo}–${B.hi}% equity</b>). But you’re close enough that it’s worth starting to <b>build ballast deliberately</b> rather than all at once — the classic glide path de-risks slowly now and faster later.`
  else if (z >= 10)
    body = `This is where a thoughtful investor <b>begins the glide in earnest</b>. A still growth-tilted mix (<b>~${B.lo}–${B.hi}% equity</b>) keeps compounding working, while a rising bond/debt sleeve starts protecting the balance you’ve built. Sequence-of-returns risk — a bad crash right before you stop earning — becomes a real consideration within the decade.`
  else if (z >= 6)
    body = `You’re in the transition zone. Equity (<b>~${B.lo}–${B.hi}%</b>) still matters for a retirement that may last 25–30+ years, but <b>capital preservation now shares the wheel</b>. A large drawdown here is harder to recover from with fewer earning years left, so a solid debt/cash buffer is prudent.`
  else if (z >= 3)
    body = `With retirement close, the priority shifts toward <b>protecting what you have</b> (equity ~<b>${B.lo}–${B.hi}%</b>, the rest in high-quality debt/cash). The danger to guard against is a steep market fall in the first years of drawdown — hence a meaningful bond/cash cushion to spend from without selling equities low.`
  else
    body = `At or past your target date, the job is <b>turning wealth into durable income</b>. You still want some equity (~<b>${B.lo}–${B.hi}%</b>) so a 25–30-year retirement keeps pace with inflation, but the ballast dominates. Bogle also counted pensions/annuities as “bond-like” wealth when sizing this.`
  P.push(`<p>${body}</p>`)
  P.push(
    `<p>As a conservative cross-check, Bogle’s old rule of thumb — <b>“roughly your age in bonds”</b> — would put you near <b>${100 - B.bogleEq}% bonds / ${B.bogleEq}% equity</b> at ${age}. He treated it only as a starting point (never below 25% or above 75% in stocks), to be adjusted for your income stability and nerves. Treat the band above as the intent; the exact number is yours to set.</p>`,
  )
  P.push(`<h4>What a “glide path” is</h4>`)
  P.push(
    `<p>A <b>glide path</b> is simply a plan to gradually dial equity <i>down</i> and bonds <i>up</i> as retirement approaches — automatically, so you’re never guessing when to “get out.” Target-date funds implement exactly this. The evidence-based shape isn’t a straight line: it tends to <b>stay equity-heavy until the mid-40s, then do most of the de-risking between ~45 and ~60</b>, and hold a still-meaningful equity slice into retirement. The elegance is that it removes market-timing decisions and makes risk reduction a steady, pre-committed habit.</p>`,
  )
  if (has) {
    const tv = pf!.totalValue
    const eq = (pf!.alloc.equity / tv) * 100
    const debt = (pf!.alloc.debt / tv) * 100
    const cash = (pf!.alloc.cash / tv) * 100
    const other = (pf!.alloc.other / tv) * 100
    const india = ((pf!.geo || []).find((g) => g.country === 'India') || { pct: 0 }).pct * 100
    const intl = 100 - india
    const act = pf!.funds.filter((f) => f.active)
    const nA = act.length
    const top = act.slice().sort((a, b) => b.marketValue - a.marketValue)[0]
    const topPct = top ? (top.marketValue / tv) * 100 : 0
    P.push(`<h4>How your portfolio looks against that</h4>`)
    P.push(
      `<div class="co-metric">Today your ${inr(tv)} is roughly <b>${eq.toFixed(0)}% equity</b>, ${debt.toFixed(0)}% debt, ${cash.toFixed(0)}% cash${other > 0.5 ? `, ${other.toFixed(0)}% other (gold/commodity/hedged)` : ''} — held across ${nA} scheme${nA === 1 ? '' : 's'}.</div>`,
    )
    let verdict: string
    if (eq < B.lo - 6)
      verdict = `Your <b>${eq.toFixed(0)}% equity is below</b> the ~${B.lo}–${B.hi}% your horizon could support. If the debt/cash is earmarked for a near-term goal, fine — otherwise it may be quietly capping your long-run growth. Worth asking whether it’s a deliberate choice or just idle drag.`
    else if (eq > B.hi + 6)
      verdict = `Your <b>${eq.toFixed(0)}% equity is above</b> the ~${B.lo}–${B.hi}% band. That’s defensible if your income is stable and you truly won’t flinch in a 30–40% drawdown — but be honest about sequence risk given your horizon, since staying the course is the whole game.`
    else
      verdict = `Your <b>${eq.toFixed(0)}% equity sits inside</b> the ~${B.lo}–${B.hi}% your horizon suggests — broadly well-aligned. The task now is mostly maintenance: rebalance periodically and let the glide path do the rest.`
    P.push(`<p>${verdict}</p>`)
    const notes: string[] = []
    if (cash + other > 25)
      notes.push(
        `A sizeable <b>${(cash + other).toFixed(0)}% in cash/commodity/hedged</b> sleeves dampens volatility but also dilutes the equity engine — check it’s intentional, not just parked money.`,
      )
    if (topPct > 35 && top)
      notes.push(
        `Your largest holding is <b>${topPct.toFixed(0)}% of the portfolio</b> (${escapeHtml(shortName(top.name))}). Concentration like that adds single-fund risk; Bogle’s answer is to own the whole market cheaply rather than bet on one sleeve.`,
      )
    if (intl < 8)
      notes.push(
        `Only about <b>${intl.toFixed(0)}% sits outside India</b> — a strong home-country tilt. Some global (mainly US) exposure historically lowers single-country risk; the Geographical Concentration chart shows your split.`,
      )
    else notes.push(`Roughly <b>${intl.toFixed(0)}% is invested outside India</b>, giving you some genuine global diversification — see the Geographical Concentration chart.`)
    if (notes.length) P.push(`<p>` + notes.join(' ') + `</p>`)
  } else {
    P.push(`<p class="commentary-empty">Load a statement to see how your <i>actual</i> equity/debt mix and geography compare with the band above.</p>`)
  }
  P.push(`<h4>The Bogle / Boglehead lens</h4>`)
  P.push(
    `<p>Whatever band you choose, John Bogle’s core lessons carry the most weight over ${z > 0 ? `${z} years` : 'a long retirement'}: <b>cost is the enemy of returns</b> — favour low-expense index funds, since the market’s return minus fees is what you actually keep; <b>own broad markets, not bets</b> — a simple three-fund-style core (a domestic equity index, an international equity slice, and high-quality debt) captures nearly everything at minimal cost; and <b>stay the course</b> — the biggest destroyer of real-world returns is reacting to volatility, not volatility itself. Set the allocation, automate contributions, rebalance occasionally, and mostly leave it alone.</p>`,
  )
  P.push(
    `<div class="commentary-refs"><b>To read further:</b> John C. Bogle, <i>The Little Book of Common Sense Investing</i> and <i>Common Sense on Mutual Funds</i> · Bogleheads wiki: <a href="https://www.bogleheads.org/wiki/Asset_allocation" target="_blank" rel="noopener">Asset allocation</a>, <a href="https://www.bogleheads.org/wiki/Glide_paths" target="_blank" rel="noopener">Glide paths</a>, <a href="https://www.bogleheads.org/wiki/Three-fund_portfolio" target="_blank" rel="noopener">Three-fund portfolio</a>, <a href="https://www.bogleheads.org/wiki/Bogleheads%C2%AE_investment_philosophy" target="_blank" rel="noopener">Investment philosophy</a>.</div>`,
  )
  P.push(
    `<div class="commentary-disc">This is general, educational commentary generated from rules of thumb and your statement data — not personalised financial advice. Your right allocation also depends on income stability, other assets, dependants, goals and temperament. For decisions, consult a SEBI-registered investment adviser.</div>`,
  )
  return P.join('')
}
