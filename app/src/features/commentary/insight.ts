import type { Portfolio } from '../../engine/types'

// A short, portfolio-only read of the current asset mix for the lean-view
// Insight card — distinct from buildCommentaryHTML, which needs an age and
// target retirement age the user hasn't given yet on first load. Plain text
// (no HTML), so no escaping/dangerouslySetInnerHTML sink is needed here.
export function buildInsight(pf: Portfolio): string {
  const tv = pf.totalValue
  if (!isFinite(tv) || tv <= 0) return 'Once your statement loads, a quick read on your asset mix appears here.'

  const eq = (pf.alloc.equity / tv) * 100
  const debt = (pf.alloc.debt / tv) * 100
  const cash = (pf.alloc.cash / tv) * 100
  const other = (pf.alloc.other / tv) * 100

  const stance = eq >= 70 ? 'growth-tilted' : eq >= 45 ? 'balanced' : eq >= 20 ? 'conservative' : 'capital-preservation focused'
  const ballastBits: string[] = []
  if (debt >= 5) ballastBits.push(`${Math.round(debt)}% debt`)
  if (cash >= 5) ballastBits.push(`${Math.round(cash)}% cash`)
  if (other >= 5) ballastBits.push(`${Math.round(other)}% other`)
  const ballast = ballastBits.length ? ` and ${ballastBits.join(', ')}` : ''

  return `You're ${stance} with ${Math.round(eq)}% equity${ballast}. Add your age and target retirement age in the full commentary for a horizon-tailored read.`
}
